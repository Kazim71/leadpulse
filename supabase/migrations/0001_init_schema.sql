-- =====================================================================
-- leadpulse — Phase 1: initial schema
-- Multi-tenant lead capture. Schema + RLS only, no application logic.
-- Target: fresh Supabase project (Postgres 15+, auth schema present).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. organizations
-- ---------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  -- Public tenant identifier for the tracking snippet. It is embedded in
  -- page source and therefore NOT a secret: it authorizes anonymous event
  -- ingestion for one org and nothing else. Read paths stay behind RLS.
  api_key    text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. admin_users  (1:1 with auth.users, scoped to one organization)
-- ---------------------------------------------------------------------
create table public.admin_users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'admin'
                    check (role in ('owner', 'admin', 'agent')),
  created_at      timestamptz not null default now(),
  unique (id, organization_id)
);

create index admin_users_organization_id_idx
  on public.admin_users (organization_id);

-- ---------------------------------------------------------------------
-- 3. contacts
-- ---------------------------------------------------------------------
create table public.contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone           text,
  email           text,
  name            text,
  city            text,
  state           text,
  country         text,
  pincode         text,
  first_seen      timestamptz,
  last_seen       timestamptz,
  message_status  text not null default 'none'
                    check (message_status in ('ready', 'cooldown', 'messaged', 'none')),
  created_at      timestamptz not null default now(),
  constraint contacts_phone_or_email
    check (phone is not null or email is not null)
);

create index contacts_organization_id_idx
  on public.contacts (organization_id);

create index contacts_org_phone_idx
  on public.contacts (organization_id, phone);

create index contacts_org_email_idx
  on public.contacts (organization_id, email);

create index contacts_org_last_seen_idx
  on public.contacts (organization_id, last_seen desc);

-- Identity uniqueness within a tenant. Partial uniques (not a composite
-- unique) so a contact known only by phone and one known only by email
-- can coexist, while the same phone/email never duplicates inside an org.
-- These also back the upsert path Phase 2's /identify will use.
create unique index contacts_org_phone_uniq
  on public.contacts (organization_id, phone)
  where phone is not null;

create unique index contacts_org_email_uniq
  on public.contacts (organization_id, email)
  where email is not null;

-- ---------------------------------------------------------------------
-- 4. events
-- ---------------------------------------------------------------------
-- metadata mirrors the SaleAssist tracking payload:
--   { view_data: { url },
--     actionField: { list, id, step, option },
--     products: [{ name, id, price, brand, category, variant, quantity }],
--     promotions: [{ id, name, creative, position }] }
-- Kept as jsonb rather than normalized tables: the shape varies per
-- event_type and the dashboard reads it as a whole document.
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- nullable: anonymous at capture time, backfilled when the visitor is identified
  contact_id      uuid references public.contacts(id) on delete set null,
  visitor_id      text not null,
  event_type      text not null,
  url             text,
  metadata        jsonb not null default '{}'::jsonb,
  city            text,
  state           text,
  country         text,
  pincode         text,
  created_at      timestamptz not null default now()
);

create index events_org_created_at_idx
  on public.events (organization_id, created_at desc);

create index events_org_visitor_idx
  on public.events (organization_id, visitor_id);

create index events_org_contact_idx
  on public.events (organization_id, contact_id);

create index events_metadata_gin_idx
  on public.events using gin (metadata jsonb_path_ops);

-- Deliberately NOT a check constraint on event_type: new tracked events
-- ship from the snippet ahead of a migration. Validation lives in the
-- ingestion layer (Phase 2) where an unknown type can be rejected with a
-- useful 400 instead of a constraint violation.

-- ---------------------------------------------------------------------
-- 5. visitor_identity_map
-- ---------------------------------------------------------------------
create table public.visitor_identity_map (
  visitor_id      text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (visitor_id, organization_id)
);

create index visitor_identity_map_contact_idx
  on public.visitor_identity_map (organization_id, contact_id);

-- =====================================================================
-- Auth helper
-- =====================================================================
-- Single place where "which org is the caller in?" is decided. Every
-- policy below calls this instead of repeating the subquery.
--
-- SECURITY DEFINER is required: the function reads admin_users, and
-- admin_users itself has RLS whose policy calls this function. Without
-- definer rights that recurses. `stable` lets the planner call it once
-- per statement rather than per row.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id
  from public.admin_users
  where id = auth.uid();
$$;

revoke all on function public.current_org_id() from public;
grant execute on function public.current_org_id() to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.organizations       enable row level security;
alter table public.admin_users         enable row level security;
alter table public.contacts            enable row level security;
alter table public.events              enable row level security;
alter table public.visitor_identity_map enable row level security;

-- organizations: read-only, own row only. No insert/update/delete policy
-- exists, so authenticated users cannot create or rename orgs — that is a
-- service_role operation (service_role bypasses RLS entirely).
create policy organizations_select_own
  on public.organizations
  for select
  to authenticated
  using (id = public.current_org_id());

-- admin_users
create policy admin_users_select_own_org
  on public.admin_users
  for select
  to authenticated
  using (organization_id = public.current_org_id());

create policy admin_users_insert_own_org
  on public.admin_users
  for insert
  to authenticated
  with check (organization_id = public.current_org_id());

create policy admin_users_update_own_org
  on public.admin_users
  for update
  to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy admin_users_delete_own_org
  on public.admin_users
  for delete
  to authenticated
  using (organization_id = public.current_org_id());

-- contacts
create policy contacts_select_own_org
  on public.contacts
  for select
  to authenticated
  using (organization_id = public.current_org_id());

create policy contacts_insert_own_org
  on public.contacts
  for insert
  to authenticated
  with check (organization_id = public.current_org_id());

create policy contacts_update_own_org
  on public.contacts
  for update
  to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy contacts_delete_own_org
  on public.contacts
  for delete
  to authenticated
  using (organization_id = public.current_org_id());

-- events
create policy events_select_own_org
  on public.events
  for select
  to authenticated
  using (organization_id = public.current_org_id());

create policy events_insert_own_org
  on public.events
  for insert
  to authenticated
  with check (organization_id = public.current_org_id());

create policy events_update_own_org
  on public.events
  for update
  to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy events_delete_own_org
  on public.events
  for delete
  to authenticated
  using (organization_id = public.current_org_id());

-- visitor_identity_map
create policy vim_select_own_org
  on public.visitor_identity_map
  for select
  to authenticated
  using (organization_id = public.current_org_id());

create policy vim_insert_own_org
  on public.visitor_identity_map
  for insert
  to authenticated
  with check (organization_id = public.current_org_id());

create policy vim_update_own_org
  on public.visitor_identity_map
  for update
  to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy vim_delete_own_org
  on public.visitor_identity_map
  for delete
  to authenticated
  using (organization_id = public.current_org_id());

-- =====================================================================
-- Grants
-- =====================================================================
-- Table-level privileges are separate from RLS: without these, policies
-- never get a chance to run. `anon` gets nothing — the tracking snippet
-- writes through the backend service role, never straight to PostgREST.
grant select on public.organizations to authenticated;
grant select, insert, update, delete
  on public.admin_users, public.contacts, public.events, public.visitor_identity_map
  to authenticated;
