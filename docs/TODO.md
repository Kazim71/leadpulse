# TODO / deferred items

Consolidated from explicit `TODO` comments in the codebase plus items the
corresponding phase briefs explicitly called out as "not built" or
"fast-follow." Nothing here is invented — each item links to where it's
flagged in code, or names the conversation/phase that deferred it. Updated
whenever something here is resolved or something new is deferred, per the
standing instruction in `README.md`.

---

## Blocked (needs an external decision/resource, not just engineering time)

### Admin invites can't use email — no SMTP configured
**Where:** `frontend/src/app/api/admin/invite/route.ts`
`auth.admin.inviteUserByEmail()` was tested against the live project and
returns `400 "Email address ... is invalid"` — Supabase's built-in mailer
only delivers to project team members; a real invite email needs a custom
SMTP provider wired up in the Supabase Auth settings. Until then, the invite
flow creates the user directly with a generated temp password and displays
it once on screen for the platform admin to relay out of band.
**Unblocks when:** custom SMTP is configured in Supabase Auth settings, then
swap to `inviteUserByEmail()` and drop the temp-password path entirely.

### Contact form submissions land in a DB table only
**Where:** `frontend/src/components/marketing/ContactForm.tsx`,
`supabase/migrations/0004_contact_inquiries.sql`
Same root cause as the admin-invite gap above: no SMTP is configured, so
there is no email notification when a visitor submits the `/contact` form.
Submissions land in `contact_inquiries` and are readable only by
`platform_admins` — check the table manually (or via the Supabase SQL
editor) until SMTP exists. **Unblocks when:** SMTP is configured; then add a
notification (email, or a row in the existing notification-bell signal
pattern from the dashboard feature expansion) on insert.

---

## Deferred by design (explicit engineering tradeoff, not a gap)

### No idempotency key on event ingestion
**Where:** `backend/src/modules/events/events.service.ts`
A network retry from the snippet writes the event twice today — accepted as
harmless duplication for the MVP (skews counts, doesn't corrupt identity
resolution). Fix: client-generated `event_id`, unique index on
`(organization_id, event_id)`, `ON CONFLICT DO NOTHING` insert.

### No retry / offline queue in the tracking snippet
**Where:** `tracking-snippet/src/api.ts`
A dropped network request is silently lost; `console.warn`s in dev only.
Deliberately kept out of the snippet to protect the <5kb bundle budget. Fix
would be a bounded retry with backoff, or a localStorage buffer flushed on
next page load.

### Contact merge conflict (phone matches one contact, email matches another)
**Where:** `supabase/migrations/0002_identify_fn.sql` (flagged for "phase 5")
`identify_visitor()` currently attaches to the phone match and lets the
email `UPDATE` fail with a `23505` (surfaced to the API caller as a 409) if
the email is already claimed by a different contact. A real merge (fold
contact B into A, repoint their events and identity-map rows, keep an audit
trail) needs its own endpoint — this is a genuine data-modeling decision,
not a quick fix.

---

## Not built yet

### Shopify integration — partially live, product/search/category pending
**Update 2026-07-20:** this is no longer "never pasted" — the tracker
bundle is loaded on a real Shopify theme ("Aarav Electronics," a
duplicate/clone theme) for the "Shopify Test" organization, and `page_view`
auto-tracking is confirmed landing correctly in Supabase.

Still pending: three Liquid+JS snippets were authored for
`productDetail` (product page), `search` (search results), and
`category_view` (collection page) — see
`tracking-snippet/shopify-integration.md` for the exact code and file
placement. **Not yet pasted into the live theme or verified against
Supabase** — no Shopify admin access exists in this environment, so these
were handed off as copy-paste instructions rather than confirmed working.
**Unblocks when:** each snippet is manually pasted into the theme editor
and a test page load is checked against the verification query in
`shopify-integration.md`.

Also out of scope so far: `addToCart` tracking on the cart button/drawer —
not requested in the product/search/category task, flagged as a possible
follow-up in `shopify-integration.md`.

### Dashboard is not deployed anywhere
`frontend/` runs locally (`npm run dev` / `npm run start`) and has been
verified there, including a full headless-browser run of login, the
provisioning flow, and dark mode. No Vercel/Netlify/other hosting has been
set up. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` would need to be set as real environment
variables (not `.env.local`) on whatever host is chosen.

### `/super-admin/org/[organizationId]/summary` is not a separate route
The Phase 7 brief's file structure sketch included this as its own page.
It was built instead as a single page
(`frontend/src/app/super-admin/org/[organizationId]/page.tsx`) that renders
both `SummaryPanel` and `LeadsTable` together, matching how the org-admin's
own `/dashboard` + `/dashboard/summary` pair actually gets used. If a
genuinely separate route is wanted later, this is a routing change, not a
data or auth change.

### No theme toggle on `/login` or `/signup`
The dark/light toggle lives inside `AppShell` (the authenticated dashboard
shell). The unauthenticated auth pages render outside `AppShell` and have no
toggle. `next-themes` and the stored preference still apply globally once a
user is logged in.

### CSV export on the leads table
Named as a "fast-follow" in the original Phase 7 brief. Not built. The
underlying data (`getLeads()` in `frontend/src/lib/queries.ts`) is already
shaped as one row per contact with an event list, so this is a formatting
task on already-available data, not a new query.

### No date-range filter control in the UI
The dashboard feature-expansion task assumed "the existing date-range filter
already in the UI" when specifying chart behavior. No such filter exists —
confirmed by grepping the codebase before building the charts. The new
`getEventsOverTime()` / `getPlatformEventsOverTime()` queries
(`frontend/src/lib/queries.ts`) accept a `days` parameter and default to a
fixed 14-day window instead. Wiring a real date-range picker through to
these functions is straightforward (the parameter already exists) but the
UI control itself is not built.

### CSV export sparkline on stat cards
`StatCard` (`frontend/src/components/ui/StatCard.tsx`) supports a `trend`
prop (real prior-period percentage, computed by `getEventCountTrend()`) but
not yet an inline sparkline — the 2026-07-19 feature-expansion brief called
sparklines a "nice to have," and the trend badge was judged sufficient
signal for the time invested. Would need a per-day breakdown per stat card
rather than a single trend query.

### Per-org tracking snippet self-service
The super-admin provisioning flow (`/super-admin/new-org`) generates a real,
working `api_key` for a new organization and displays it once, but there is
no in-dashboard flow yet for an org admin to view or regenerate their own
org's key after the fact — today that requires a platform admin or a direct
database query.

---

## Already resolved, kept here so it isn't accidentally re-flagged

### Activity timeline on the leads table
The original Phase 7 brief listed "activity timeline expand" as a
fast-follow alongside CSV export. It is actually **built** —
`frontend/src/components/LeadsTable.tsx` has expandable rows showing each
lead's `recentEvents`. Only CSV export remains outstanding from that pairing.

### Nav-highlight bug on `/super-admin/new-org`
Fixed 2026-07-19. `activeHref` used to be a hardcoded string passed once per
layout (`super-admin/layout.tsx` always passed `"/super-admin"`), so the
sidebar could never reflect the actual route. Replaced with
`resolveActiveHref()` in `frontend/src/components/SidebarNav.tsx`, which
derives the active item from `usePathname()` using longest-prefix matching
— needed so `/super-admin/org/[id]` still resolves to "Companies" while
`/super-admin/new-org` resolves to "Provision", rather than both matching
the shorter `/super-admin` prefix.
