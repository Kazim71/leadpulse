# Changelog

Reverse-chronological. One entry per task/phase.

---

## 2026-07-20 — Shopify theme wiring: product/search/category snippets

Authored (not executed — no Shopify admin access exists in this
environment) three Liquid+JS snippets for the "Aarav Electronics" duplicate
theme, wiring real template data into `window.leadpulse.track()` calls:
`productDetail` (product page), `search` (search results), `category_view`
(collection page). Builds on the already-live `page_view` auto-tracking.
Does not modify `tracking-snippet/src/tracker.ts` or the built dist file —
Liquid-side only. Full reference copy saved to
`tracking-snippet/shopify-integration.md`.

Key correctness detail surfaced before writing anything: `defer`/`async`
have no effect on inline `<script>` tags (only on scripts with a `src`), so
an inline snippet placed in a template can execute before a deferred
tracker bundle finishes loading. Since `theme.liquid` can't be inspected
directly to confirm the stub-queue pattern from `TESTING.md` is present,
every snippet waits for `DOMContentLoaded` and logs a `console.warn` if
`window.leadpulse` still isn't ready, rather than silently dropping the
event on a load-order race.

Event payload shapes were checked against
`backend/src/modules/events/events.schema.ts` before writing any Liquid —
in particular, the search term was placed in `actionField.option` to match
the exact shape already used by `supabase/seed.sql`'s seeded search event,
rather than inventing a new field.

**Not verified end-to-end** — unlike every other entry in this changelog,
there is no live-database confirmation here yet, because these snippets
haven't been pasted into the real theme. See `docs/TODO.md`.

---

## 2026-07-19 — Contact form verified end-to-end

Migration `0004_contact_inquiries.sql` was applied (by the user, in the
Supabase SQL editor — DDL can't run through PostgREST). Ran the prepared
`frontend/test/verify-contact-form.mjs` against the live database: a real
browser submission through `/contact` shows the success state and lands a
row with the correct `name`/`email`/`message`; a direct anon-key client can
INSERT (confirming the RLS policy actually grants it, not just that the
form's own request happened to work); the same anon-key client's SELECT
attempt on that row returns an empty result rather than an error or the row
itself (confirming RLS blocks the read rather than merely that nobody built
a read path); and a platform-admin login can read the row
(`is_platform_admin()` policy working in the other direction). All 6
checks passed; test rows removed after, table confirmed empty. The
"blocked" note from the prior entry is resolved — see `docs/TODO.md`,
which now reflects only the SMTP-notification gap, not a verification gap.

---

## 2026-07-19 — Public marketing site

Built the full public site: landing page at `/` (auth-aware) plus four
always-public pages (`/about`, `/features`, `/product`, `/contact`),
sharing one header/nav/footer via a new Next.js route group,
`frontend/src/app/(marketing)/`. `/blog` and `/pricing` explicitly out of
scope, per the brief.

- **Auth-aware `/`**: reuses `getViewer()` — the same role-resolution
  function every other protected route already uses — rather than
  reimplementing it. Anonymous visitors see the landing page; `org_admin`
  → `/dashboard`, `platform_admin` → `/super-admin`, `unassigned` →
  `/pending`, exactly matching the existing role model. The old root
  `src/app/page.tsx` (pure redirect, no content) was replaced by
  `(marketing)/page.tsx`, since a route group's `page.tsx` maps to the same
  URL and both can't coexist.
- **Middleware updated**: `frontend/src/lib/supabase/middleware.ts`'s
  public-path allowlist gained `/`, `/about`, `/contact`, `/features`,
  `/product` — without this, an anonymous visit to any of the four pages
  would have been bounced to `/login` before ever reaching the page
  component. `/dashboard` and `/super-admin` protections are untouched.
- **Contact form**: real insert into a new `contact_inquiries` table
  (`supabase/migrations/0004_contact_inquiries.sql`) via the anon-key
  browser client — no backend API involved, consistent with "frontend
  reads/writes via anon key + RLS." This is the first table in the project
  where `anon` gets real write access; every prior table's policy was "anon
  gets nothing" (see 0001's Grants section) because writes went through the
  trusted backend's service_role instead. Scoped narrowly: anon may INSERT
  only, `is_platform_admin()` (reused from 0003, not reinvented) gates
  SELECT.
- **`/features` copy verified against the codebase before writing it** —
  the 11 event types are copy-pasted from `EVENT_TYPES` in
  `events.schema.ts`, not summarized from memory; CSV export is deliberately
  **not** listed (confirmed absent via grep); "always-current," not
  "real-time," describes the dashboard, since it's `force-dynamic`
  Server Components on each request, not a websocket/polling live feed —
  claiming "real-time" would have overstated what's built.
- No invented usage statistics on the landing page (brief explicitly ruled
  this out) — the capabilities section frames real, built capabilities
  instead of fabricated numbers like lead counts.

**Verified:** production build (17/17 routes). 14/14 checks in a real
headless-Chrome run: anonymous `/` renders the full landing page; logging
in as an actual org-admin and as an actual platform-admin each redirect `/`
to the correct destination; all four public pages render with the shared
header/footer and are reachable via real nav-link clicks; both themes
render correctly on all five pages.

Migration `0004_contact_inquiries.sql` was pending at the time of this
entry; end-to-end verification of the contact form and its RLS policies is
recorded in the entry above this one, dated the same day.

---

## 2026-07-19 — Nav-highlight fix + dashboard feature expansion

**Bug fix (Part 1):** `activeHref` on the sidebar nav was a hardcoded string
passed once per layout — `super-admin/layout.tsx` always passed
`"/super-admin"`, so navigating to `/super-admin/new-org` ("Provision")
still highlighted "Companies." Replaced with `resolveActiveHref()` in the
new `frontend/src/components/SidebarNav.tsx`, deriving the active item from
`usePathname()` with longest-prefix matching (needed so
`/super-admin/org/[id]` still resolves to "Companies" rather than
colliding with "Provision"). **Verified** via computed `aria-current` and
background color on both routes in a real browser, not by reading the code.

**Feature expansion (Part 2), scoped to visual/UX depth only — no schema,
RLS, auth, or existing query restructuring:**

- **Sidebar collapse**: icon-only collapsed state, persisted to
  `localStorage` (`lc_sidebar_collapsed`), with hover tooltips on collapsed
  icons. Extracted the interactive chrome into a new client component,
  `DashboardChrome.tsx`, composed by the still-server `AppShell.tsx` —
  `children` (the page's own Server Component tree) passes through the
  client boundary without being forced to render client-side.
- **Mobile hamburger overlay**: the sidebar was already `hidden ... lg:block`
  (unchanged breakpoint); added the missing hamburger button + overlay
  drawer for everything below `lg`.
- **Notification bell**: real derived signal, not a fake badge — contacts
  with `message_status='ready'` and `last_seen` within 24h
  (`getReadySignal()` / `getPlatformReadySignal()` in `queries.ts`). Honest
  limitation documented inline: `contacts` has no status-change timestamp,
  so this is "recently active leads currently marked ready," not literally
  "became ready in the last 24h" — the UI copy says so rather than
  overclaiming precision the schema can't support.
- **Charts**: added `recharts` (justification in a code comment on
  `EventsOverTimeChart.tsx` — SVG-based, composes as JSX, no second
  rendering pipeline). One real chart on both the org-admin's
  `/dashboard/summary` and the super-admin's per-org drill-down
  (`getEventsOverTime()`, scoped by `organization_id`), plus a genuine
  cross-org aggregate on the super-admin index page
  (`getPlatformEventsOverTime()` — documented as the one deliberate
  exception to "every query filters `organization_id`," since that's the
  entire point of the platform-wide view). The existing "Events by type"
  styled-div bars were deliberately left as-is rather than converted to a
  second chart component — already themed correctly and not worth the
  churn for this task.
- **Stat card trends**: `StatCard` gained an optional `trend` prop showing a
  real week-over-week percentage from `getEventCountTrend()`. Returns
  `pctChange: null` (rendered as "new") when the prior week has zero events,
  rather than an infinite or fabricated percentage.
- **Loading states**: added `loading.tsx` (Next.js route-segment Suspense
  boundaries) for `/dashboard`, `/dashboard/summary`, `/super-admin`, and
  `/super-admin/org/[id]`, using new `Skeleton`/`TableSkeleton`/
  `CardSkeleton`/`CardGridSkeleton` primitives — previously these routes had
  no loading UI at all.
- **Empty states**: audited rather than assumed — `LeadsTable` and
  `CompanyGrid` already had them; `SummaryPanel`'s sub-widgets already
  handled zero-data per-section. Added one new empty state, inside
  `EventsOverTimeChart` itself, for a window with zero events.

**Corrected against the brief:** no date-range filter exists anywhere in
this UI (confirmed by grep before writing any chart code) — the brief's
"existing date-range filter" didn't exist to plumb into, so the new time-
series queries take a `days` parameter defaulting to 14 instead. Flagged
in `docs/TODO.md` rather than silently building a filter control that
wasn't asked for or scoped.

**Verified:** full production build (13/13 routes); 18/18 checks in a real
headless-Chrome run covering both nav-highlight routes, sidebar
collapse+persistence+reload, mobile drawer open/close, the notification
bell's real dropdown content (confirmed showing the actual seeded
`Priya Nair` / Acme Test Store row), chart SVG presence in both light and
dark mode, the trend badge's honest "new" state, and — re-checked, not
assumed — that the theme toggle, RLS-backed `/super-admin` gating for an
org admin, and the provisioning route's 403 all still work after the
refactor.

---

Entries below this point are
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
