# Changelog

Reverse-chronological. One entry per task/phase. Entries below this point are
a reconstruction from git history and code comments (only one commit exists
so far — `11de6b7`, covering Phases 1-3 — everything since is uncommitted
local work). Going forward, a new entry is appended at the end of every task
per the standing instruction in `README.md`.

---

## 2026-07-19 — Documentation pass

Created `README.md`, `docs/CHANGELOG.md`, `docs/TODO.md`. No application code, schema, or config touched. Established the standing instruction (in `README.md`) to update these two docs at the end of every future task automatically.

---

## 2026-07-19 — Dashboard re-theme (pastel accents)

Token-only swap of `frontend/tailwind.config.ts`, replacing the single-accent clay/moss/ochre palette with a warm neutral base (`ink`, unchanged) plus a four-color pastel accent family (`blush`, `lilac`, `mint`, `peach`) for status badges, category tags, and chart series. `brick` (errors) kept separate from the accent family on purpose.

Added `categoryTone()` — a deterministic string-hash color assignment so a given industry/category keeps the same accent across renders and reloads.

**Verified:** production build passes; confirmed via headless Chrome that light/dark both render with correct computed colors (e.g. dark-mode stat label crosses from `#8F3B50` to `#E9A9B5` rather than washing out); confirmed `src/lib/` and `src/app/api/` have zero diff, i.e. no data or auth logic was touched.

---

## 2026-07-19 — Super-admin provisioning flow

Added `frontend/src/app/api/admin/organizations/route.ts` and `.../invite/route.ts` — Route Handlers using a service-role Supabase client (`frontend/src/lib/supabase/admin.ts`, guarded with `server-only`) to create organizations and invite org admins. Both routes independently re-check `getPlatformAdminOrNull()` server-side — the UI hiding the form proves nothing on its own.

Two Supabase Admin API behaviors were probed empirically before building around them (per the "don't assume" instruction):
- `auth.admin.inviteUserByEmail()` returns `400 "Email address is invalid"` in this project because no custom SMTP is configured. **Not usable yet** — see `docs/TODO.md`.
- `auth.admin.createUser()` + a generated temp password works, and duplicate emails return a handleable `422 email_exists`.

`api_key` generation is not reimplemented in Node — the org insert omits the column and lets the Postgres column default from `0001_init_schema.sql` (`encode(gen_random_bytes(24),'hex')`) generate it, so the format lives in exactly one place.

**Verified:** full headless-Chrome run creating a real organization, confirming the generated `api_key` is a real 48-hex-char value in the DB, confirming that key is *accepted by the live Render backend* (a 202 on `/api/events`, not just present in the DB), inviting a real admin, and logging in as that new admin to confirm they land on `/dashboard` scoped to only their new org with zero seed-tenant data visible. Also verified an org-admin gets 403 from both routes via direct POST, not just a hidden link.

---

## 2026-07-19 — Phase 7: two-tier auth dashboard + schema patch

**Schema** (`supabase/migrations/0003_super_admin.sql`): added `organizations.industry` (free text), a new `platform_admins` table (deliberately separate from `admin_users` — a platform admin has no home org and forcing one into that model would mean a nullable `organization_id` weakening every existing policy), and `is_platform_admin()` (SECURITY DEFINER, mirrors `current_org_id()`'s pattern).

Extended the *SELECT* policies only on `organizations`/`admin_users`/`contacts`/`events`/`visitor_identity_map` with `OR is_platform_admin()`. Deliberately **not** added to INSERT/UPDATE/DELETE — the brief's own phrasing ("read access") was followed over the literal "every USING clause" instruction, because DELETE policies have only a USING clause and no WITH CHECK, so adding it there would have granted platform admins delete rights on every tenant's data. This was flagged explicitly rather than silently resolved.

**Dashboard** (`frontend/`): Next.js 14 App Router, Supabase Auth, Tailwind. `/dashboard` (org-admin, org id resolved server-side from their `admin_users` row, never from a URL param) and `/super-admin` (platform admin, company grid + per-org drill-down at `/super-admin/org/[organizationId]`, gated by a server-side `requirePlatformAdmin()` at the layout level so the whole subtree is protected). Custom design tokens (original clay/ink/moss palette at this point, replaced in the later re-theme task above), Fraunces display serif + DM Sans, dark mode via `next-themes` with light as default.

Presentational components (`LeadsTable`, `SummaryPanel`, `CompanyGrid`) receive data as props; all Supabase queries live in `frontend/src/lib/queries.ts` and are called from page-level Server Components, never inline in JSX.

**Verified:** 14/14 checks against the live database using real logins through the anon key — platform admin reads both orgs' contacts, cannot insert or delete into another org (proving the SELECT-only policy decision holds), org admin still sees only their own org (Phase 1's isolation guarantee unchanged), an unassigned user (no `admin_users` row) sees zero rows everywhere rather than an error.

---

## 2026-07-19 — Phase 3: browser tracking snippet

`tracking-snippet/`: standalone TypeScript module (`tracker.ts`, `visitorId.ts`, `debounce.ts`, `api.ts`) built with esbuild into a single IIFE bundle with zero runtime dependencies, under the 5kb budget (**4.41kb** actual — build script fails the build if this regresses).

- Visitor ID persisted in both localStorage and a cookie (documented rationale: Safari ITP prunes JS-set cookies aggressively, localStorage survives longer but isn't server-readable — belt and suspenders, not redundancy).
- Public API mirrors the SaleAssist convention: `window.leadpulse.track(eventName, data)` / `.identify(data)`, with a pre-init queue so calls made before the script finishes loading aren't lost.
- Event type enum kept in exact sync with the backend's `events.schema.ts` (`page_view`, `search`, `category_view`, `product_view`, `productClick`, `productDetail`, `addToCart`, `promotionClick`, `checkout`, `purchase`, `refund`).
- Client-side debounce: same `event_type:url` firing twice within 2 seconds is dropped silently, capped at 50 tracked keys with LRU eviction — explicitly a different failure mode than the backend's per-visitor rate limiter (this guards against a *correct* page firing duplicates; the backend guards against a *broken* client flooding the endpoint).
- Deliberately does **not** auto-detect product/category/search pages from URL patterns — reasoning documented inline: Shopify-specific, breaks on theme changes, and produces silently wrong analytics rather than missing analytics.

**Verified** with a real, installed Chrome driven via `puppeteer-core` against the live Phase 2 backend: `page_view` auto-fires with a real 202, all 4 manual test buttons produce correct rows in Supabase, `identify()` backfills exactly the expected event count, reload preserves the same `visitor_id`, and rapid-clicking 5 times produces exactly 1 row server-side (counted in Supabase before/after, not inferred from code).

---

## 2026-07-19 — Phase 2: Express ingestion API

`backend/`: TypeScript Express app, clean-architecture layering (`controller` → `service` → `repository`), deployed on Render.

- `config/env.ts` validates all required env vars at boot via zod and exits(1) with a clear message if anything is missing — fails fast rather than at first request.
- `config/supabaseClient.ts`: single service-role client singleton. Required a `ws` package workaround — `createClient()` eagerly constructs a `RealtimeClient` needing a native `WebSocket`, which Node 20 doesn't have (Node 22+ does); this project's actual deploy target is Node 20, so this fix is load-bearing, not cosmetic.
- `middleware/resolveOrg.ts`: `x-api-key` → `organization_id`, cached in-memory with a 60s TTL, including negative caching for unknown keys (uncached negative lookups would let a broken/malicious client bypass the cache entirely).
- `middleware/rateLimiter.ts`: in-memory sliding window per `organization_id` + `visitor_id`, documented as needing a swap to Redis if horizontally scaled.
- `POST /api/events` (202) and `POST /api/identify` (200, `{ contact_id, linked_events }`) — the latter calls a Postgres function (`identify_visitor()`, added in `0002_identify_fn.sql`) rather than sequencing three separate writes from Node, because `supabase-js` gives every call its own implicit transaction over PostgREST and there is no `BEGIN`/`COMMIT` reachable from the client — atomicity had to move into the database.
- Explicit TODOs left in place rather than solved: no idempotency key (a duplicate event on retry is accepted duplication for the MVP), no retry/offline queue on the snippet side.

**Verified** against the live Render deployment (`https://leadpulse-api-m52p.onrender.com`), not just locally: health check, valid-key ingest with the row confirmed in Supabase, invalid-key 401, invalid-payload 400, and the full identify→backfill round trip with the resulting `contact_id`/`linked_events` confirmed against the database directly rather than trusting the API's own response.

---

## 2026-07-18/19 — Phase 1: schema + migrations

`supabase/migrations/0001_init_schema.sql`: `organizations`, `admin_users`, `contacts`, `events`, `visitor_identity_map`. RLS enabled on all tenant-scoped tables, with a single `current_org_id()` SECURITY DEFINER helper referenced by every policy rather than repeating the `admin_users` subquery inline. Partial unique indexes on `contacts (organization_id, phone)` / `(organization_id, email)` where each is not null — enforces the "unique by phone OR email" requirement, which listing plain indexes alone would not have.

`events.metadata` is jsonb with no CHECK constraint on `event_type` at the database level — validation for that lives in the backend's zod schema instead, so a new event type from the snippet gets a clean 400 rather than a raw constraint violation.

`seed.sql`: two test orgs (Acme, Rival — two tenants, not one, because RLS isolation isn't testable with a single tenant), contacts, and events spanning multiple event types, including one deliberately anonymous event used later to test the identify backfill.

**Verified** via `verify.sql`, sections run manually in the Supabase SQL editor: row counts per table, RLS blocking cross-org reads when impersonating the Acme admin (`set local request.jwt.claims`), a cross-org write attempt correctly raising `42501`, and a from-scratch user with no `admin_users` row seeing zero rows across every table (default-deny).
