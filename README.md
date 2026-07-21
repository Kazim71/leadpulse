# Northcue

_(repo/folder names remain `leadpulse` — that was the original working name. The product was rebranded once to "LeadCapsule" mid-project, then again to "Northcue"; user-facing text now says Northcue everywhere. Folder/repo names were deliberately left unchanged both times to avoid churn — see `docs/CHANGELOG.md` for exactly what each rebrand touched.)_

Northcue is a multi-tenant lead-capture platform for e-commerce storefronts. A small tracking snippet sits on a client's site and records anonymous visitor behavior (page views, product views, searches, cart actions) against that client's own tenant. When the visitor later gives up a phone number or email — at checkout, in a form — the backend links that identity to everything they did anonymously before, so a business ends up with real leads and full context instead of just a form submission. A super-admin layer lets the platform owner onboard new client companies and see aggregate activity across all of them; each client's own admins only ever see their own data, enforced at the database level, not just in the UI.

## Architecture

```
┌─────────────────┐     x-api-key      ┌──────────────────┐     service_role     ┌──────────────┐
│  Client storefront│ ─────────────────▶ │   Express API    │ ────────────────────▶│   Supabase   │
│  (Shopify, etc.)  │   POST /api/events │  (Phase 2)        │   bypasses RLS,      │  Postgres +  │
│  + tracking       │   POST /api/identify│  deployed on     │   writes on any      │  Auth + RLS  │
│  snippet (Phase 3)│                    │  Render           │   tenant's behalf    │              │
└─────────────────┘                    └──────────────────┘                      └──────┬───────┘
                                                                                          │
                                                                                   anon_key + RLS
                                                                                          │
                                                                                          ▼
                                                                                  ┌──────────────────┐
                                                                                  │  Next.js dashboard│
                                                                                  │  (Phase 7)         │
                                                                                  │  /dashboard (org)  │
                                                                                  │  /super-admin      │
                                                                                  │  local only —      │
                                                                                  │  not deployed yet  │
                                                                                  └──────────────────┘
```

Two distinct trust boundaries, and this distinction is load-bearing throughout the codebase:

- **Backend API** (`backend/`) uses the Supabase **service_role** key. It is the only thing allowed to write ingestion data on a tenant's behalf, because an anonymous website visitor has no Supabase Auth session to be constrained by RLS in the first place. It resolves which tenant a request belongs to via the `x-api-key` header, cached in memory (60s TTL) so ingestion doesn't cost a DB round-trip per event.
- **Dashboard** (`frontend/`) uses the Supabase **anon** key exclusively. Every read and write is a logged-in human acting as themselves, constrained by Postgres Row Level Security — the dashboard never has more access than the database policies grant it, even for the super-admin role.

## Folder structure

```
leadpulse/
├── supabase/
│   ├── migrations/       Schema history (SQL, applied via Supabase SQL editor)
│   ├── seed.sql           Test orgs, contacts, events, admin users for local dev
│   └── verify.sql         Manual RLS verification queries (Phase 1)
├── backend/               Express + TypeScript ingestion API — deployed, service_role
├── tracking-snippet/      Standalone JS tracker, built with esbuild, <5kb, no runtime deps
├── frontend/              Next.js 14 dashboard (App Router) — anon key + RLS, local only
└── docs/
    ├── CHANGELOG.md       Dated log of what shipped, per phase and per task
    └── TODO.md            Every explicitly-flagged deferred/blocked item, consolidated
```

## Current status

**Built, deployed, and verified** (against live Supabase + live Render, not mocked):

- **Schema** (`supabase/migrations/0001, 0002, 0003`): `organizations`, `admin_users`, `contacts`, `events`, `visitor_identity_map`, RLS on all of them, plus `platform_admins` and `is_platform_admin()` for the cross-org super-admin role. Verified: tenant isolation on read AND write, default-deny for users with no role, super-admin read access without write access.
- **Backend API** (`backend/`): `POST /api/events`, `POST /api/identify`, deployed on Render at the URL in `backend/.env` (`SUPABASE_URL`) and referenced throughout `docs/CHANGELOG.md`. Rate limiting, org resolution caching, structured logging, centralized error handling. Verified end-to-end against the live deployment, including the atomic identify→backfill path.
- **Tracking snippet** (`tracking-snippet/`): builds to 4.41kb minified, visitor-id persistence (localStorage + cookie), client-side debounce, public `window.leadpulse.track()/.identify()` API with a pre-init queue. Verified with a real headless-Chrome run against the live backend, including the debounce and persistence checks done by counting actual DB rows, not by trusting the code path.
- **Dashboard** (`frontend/`): two-tier auth (`/dashboard` for org admins, `/super-admin` for platform admins), real Supabase queries (no mocked data), a provisioning flow for creating organizations and inviting admins, a custom warm-neutral + pastel-accent design system, dark mode. Verified with real logins against live RLS policies and a full headless-browser run of the provisioning flow. **Not deployed anywhere** — local only so far.

**Explicitly not built** — see `docs/TODO.md` for the full list with context. Highlights: no Shopify integration (the snippet has never touched a real storefront), no CSV export or activity-timeline polish on the leads table, `inviteUserByEmail` is blocked on SMTP configuration so admin invites hand back a temp password instead of sending an email, no idempotency keys or retry logic on ingestion (both deliberately deferred as premature for the current scale).

## Where to find things

| what | where |
|---|---|
| Live backend API | `https://leadpulse-api-m52p.onrender.com` (health check: `/health`) |
| Supabase project | Project ref `pehqfpeerlvqssqlvxgh` — see `backend/.env` / `frontend/.env.local` for the URL |
| Deployed dashboard | Not deployed — run locally per the steps below |
| Backend source | `backend/src/` |
| Dashboard source | `frontend/src/` |
| Schema history | `supabase/migrations/` (apply in numeric order via the Supabase SQL editor) |

## Local setup

Requires Node ≥ 20 (the codebase depends on the `ws` package as a Node-20-compatible transport for `@supabase/supabase-js`'s realtime client — see comments in `backend/src/config/supabaseClient.ts` and `frontend/src/lib/supabase/server.ts` for why).

1. **Database**: in the Supabase SQL editor, run `supabase/migrations/0001_init_schema.sql`, then `0002_identify_fn.sql`, then `0003_super_admin.sql`, in that order. Optionally run `supabase/seed.sql` for test data (read the comments inside it — it needs a real `auth.users` UUID pasted in before the `platform_admins` insert will work).
2. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   npm run dev             # http://localhost:4000
   ```
   See `backend/TESTING.md` for exact curl commands to verify it's working.
3. **Tracking snippet** (optional, only needed if working on the snippet itself):
   ```bash
   cd tracking-snippet
   npm install
   npm run build            # -> dist/leadpulse-tracker.min.js
   ```
   Open `tracking-snippet/test/local.html` directly in a browser to test against a running backend. See `tracking-snippet/TESTING.md`.
4. **Dashboard**:
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
                                        # and SUPABASE_SERVICE_ROLE_KEY (server-only, powers /super-admin provisioning)
   npm run dev                         # http://localhost:3000
   ```

## Docs convention (standing instruction)

At the end of every task performed in this repo, append a dated entry to `docs/CHANGELOG.md` summarizing what changed, and update `docs/TODO.md` if anything was resolved or newly flagged as deferred/blocked. This happens automatically, without being asked each time — it is not optional per-task documentation, it is how this project tracks its own history.
