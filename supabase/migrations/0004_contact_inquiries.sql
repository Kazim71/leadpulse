-- =====================================================================
-- leadpulse (LeadCapsule) — Phase: public marketing site contact form
--
-- contact_inquiries is a new kind of table for this project: every prior
-- table's stance was "anon gets nothing — writes come from the trusted
-- backend's service_role" (see the Grants section of 0001). This is the
-- first genuinely public-facing write: an anonymous website visitor,
-- submitting the /contact form straight from the browser via the anon key,
-- with no Supabase session at all. That is a deliberate, narrow exception,
-- not a relaxation of the general rule — scoped to INSERT-only, on one
-- table, with no read access for anon at all.
-- =====================================================================

create table public.contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 200),
  email      text not null check (char_length(email) between 3 and 320),
  message    text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);

alter table public.contact_inquiries enable row level security;

-- Anyone — including a visitor with no session — may submit the form.
-- There is no organization_id to scope this by; it isn't tenant data.
create policy contact_inquiries_insert_anyone
  on public.contact_inquiries
  for insert
  to anon, authenticated
  with check (true);

-- Reads are NOT public. Only the platform owner should see submitted
-- inquiries — reusing is_platform_admin() from 0003 rather than inventing
-- a second cross-cutting role check.
create policy contact_inquiries_select_platform_admin
  on public.contact_inquiries
  for select
  to authenticated
  using (public.is_platform_admin());

-- No update/delete policy exists for anyone via PostgREST — moderating or
-- purging spam submissions is a service_role (dashboard SQL editor)
-- operation for now, not an application feature.

grant insert on public.contact_inquiries to anon, authenticated;
grant select on public.contact_inquiries to authenticated;
