# Phase 2 — manual test plan

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill `.env`:

| var | where to get it |
| --- | --- |
| `SUPABASE_URL` | Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → `service_role` key (**not** `anon`) |
| `PORT` | `4000` |

Apply the Phase 2 migration in the SQL editor before starting the server —
`/api/identify` calls a function that does not exist until you do:

```
supabase/migrations/0002_identify_fn.sql
```

Then:

```bash
npm run dev
```

Expect a single JSON line, and no stack trace:

```json
{"level":"info","timestamp":"...","message":"leadpulse backend listening","port":4000,"node_env":"development"}
```

If a required env var is missing the process exits 1 with `Invalid environment
configuration` — that is the fail-fast check working, not a crash.

---

## Shell note

The commands below are **bash** (Git Bash on Windows). PowerShell mangles
single quotes and aliases `curl` to `Invoke-WebRequest`, so run them in Git
Bash. PowerShell equivalents are at the bottom.

Convenience variables:

```bash
API=http://localhost:4000
ACME_KEY=seedapikeyacme000000000000000000000000000000000000
```

---

## 1. Health check

```bash
curl -s $API/health
```

Expect `200`:

```json
{"status":"ok","uptime_seconds":3}
```

---

## 2. POST /api/events — valid key → 202

```bash
curl -i -s -X POST $API/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ACME_KEY" \
  -d '{
    "event_type": "product_view",
    "visitor_id": "vis_curl_001",
    "view_data": { "url": "https://acme-test.dev/p/sku-5001" },
    "actionField": { "list": "search-results" },
    "products": [{
      "name": "Phase2 Test Shoe",
      "id": "sku-5001",
      "price": "2999.00",
      "brand": "Acme",
      "category": "Footwear/Test",
      "variant": "Red / 9"
    }]
  }'
```

Expect `202`:

```json
{"received":true,"event_id":"<uuid>"}
```

Confirm it landed — Supabase SQL editor:

```sql
select id, event_type, visitor_id, url, contact_id, metadata
from public.events
where visitor_id = 'vis_curl_001';
```

`contact_id` should be **null** (anonymous), and `metadata` should contain
`view_data`, `actionField` and `products` exactly as sent.

---

## 3. POST /api/events — garbage key → 401

```bash
curl -i -s -X POST $API/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: totally-not-a-real-key" \
  -d '{"event_type":"page_view","visitor_id":"vis_curl_001","view_data":{"url":"https://acme-test.dev/"}}'
```

Expect `401`:

```json
{"error":{"code":"UNAUTHORIZED","message":"Missing or invalid API key"}}
```

Same result with the header omitted entirely. The message is identical in
both cases on purpose — distinguishing "unknown key" from "no key" hands an
attacker a validity oracle.

---

## 4. POST /api/events — invalid payload → 400

```bash
curl -i -s -X POST $API/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ACME_KEY" \
  -d '{"event_type":"teleport","visitor_id":"vis_curl_001","view_data":{"url":"https://x.dev/"}}'
```

Expect `400` with `code: INVALID_PAYLOAD` and a `details` array naming
`event_type`.

---

## 5. POST /api/identify — backfill → 200 with `linked_events > 0`

`vis_acme_003` is seeded with one anonymous event (`productClick`,
`contact_id` null). Confirm the starting state first:

```sql
select id, event_type, contact_id
from public.events
where organization_id = '11111111-1111-1111-1111-111111111111'
  and visitor_id = 'vis_acme_003';
```

Add the two events from steps 2 and 4 by re-running step 2 with
`"visitor_id": "vis_acme_003"` if you want a larger backfill count.

Then identify:

```bash
curl -i -s -X POST $API/api/identify \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ACME_KEY" \
  -d '{
    "visitor_id": "vis_acme_003",
    "phone": "+919812345678",
    "name": "Curl Test Lead",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "country": "IN",
    "pincode": "600001"
  }'
```

Expect `200`:

```json
{"contact_id":"<uuid>","linked_events":1}
```

Verify the backfill committed:

```sql
select e.id, e.event_type, e.contact_id, c.phone, c.name
from public.events e
join public.contacts c on c.id = e.contact_id
where e.organization_id = '11111111-1111-1111-1111-111111111111'
  and e.visitor_id = 'vis_acme_003';

select * from public.visitor_identity_map
where visitor_id = 'vis_acme_003';
```

Every row must now carry the new `contact_id`, and the identity map must
have one row pointing at it.

**Re-run the same curl.** Expect `200` with `linked_events: 0` — the contact
is matched by phone rather than duplicated, and there is nothing left to
backfill. That is the upsert path working.

---

## 6. Rate limiter → 429

Default is 60 events per visitor per 60s. Fire 65:

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code} " -X POST $API/api/events \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ACME_KEY" \
    -d '{"event_type":"page_view","visitor_id":"vis_flood_001","view_data":{"url":"https://acme-test.dev/"}}'
done; echo
```

Expect a run of `202` then `429`. The 429 body:

```json
{"error":{"code":"RATE_LIMITED","message":"Too many events for this visitor. Retry in 60s.","details":{"retry_after_seconds":60}}}
```

with a `Retry-After` header. A different `visitor_id` is unaffected —
the window is per org + visitor, not global.

---

## 7. Body size limit → 413

```bash
python -c "print('{\"event_type\":\"page_view\",\"visitor_id\":\"v\",\"view_data\":{\"url\":\"https://x.dev/\"},\"pad\":\"' + 'x'*200000 + '\"}')" > /tmp/big.json

curl -i -s -X POST $API/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ACME_KEY" \
  --data-binary @/tmp/big.json
```

Expect `413` `PAYLOAD_TOO_LARGE`.

---

## Cleanup

```sql
delete from public.events   where visitor_id in ('vis_curl_001','vis_flood_001');
delete from public.contacts where phone = '+919812345678';
delete from public.visitor_identity_map where visitor_id = 'vis_acme_003';
update public.events set contact_id = null where visitor_id = 'vis_acme_003';
```

---

## PowerShell equivalents

```powershell
$API = "http://localhost:4000"
$ACME = "seedapikeyacme000000000000000000000000000000000000"

# 202
$body = @{
  event_type = "product_view"
  visitor_id = "vis_curl_001"
  view_data  = @{ url = "https://acme-test.dev/p/sku-5001" }
  products   = @(@{ name = "Phase2 Test Shoe"; id = "sku-5001"; price = "2999.00" })
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post -Uri "$API/api/events" `
  -Headers @{ "x-api-key" = $ACME } `
  -ContentType "application/json" -Body $body

# 401 — Invoke-RestMethod throws on 4xx, so catch it
try {
  Invoke-RestMethod -Method Post -Uri "$API/api/events" `
    -Headers @{ "x-api-key" = "totally-not-a-real-key" } `
    -ContentType "application/json" -Body $body
} catch {
  $_.Exception.Response.StatusCode.value__   # 401
}
```
