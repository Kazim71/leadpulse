-- =====================================================================
-- leadpulse (product name: LeadCapsule) — Phase 7: platform super-admin
--
-- Adds a cross-org read-only role that sits OUTSIDE the org-scoping model
-- established in 0001, plus organizations.industry for grouping.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. organizations.industry
-- ---------------------------------------------------------------------
-- Free text, not an enum: the set of industries is open-ended and a new
-- vertical should not require a migration. Values are normalized by the
-- application layer ('ecommerce', 'saas', 'healthcare', ...), not the DB.
alter table public.organizations
  add column if not exists industry text;

create index if not exists organizations_industry_idx
  on public.organizations (industry);

-- ---------------------------------------------------------------------
-- 2. platform_admins
-- ---------------------------------------------------------------------
-- Deliberately NOT a role value on admin_users. An admin_users row means
-- "admin OF an organization" and carries a non-null organization_id that
-- every RLS policy keys off. A platform admin has no home org at all, so
-- modelling them there would mean either a nullable organization_id (which
-- weakens every existing policy) or a fake org (which pollutes the data).
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- ---------------------------------------------------------------------
-- 3. is_platform_admin()
-- ---------------------------------------------------------------------
-- SECURITY DEFINER for the same reason current_org_id() is: this function
-- reads platform_admins, and platform_admins' own RLS policy calls this
-- function. Without definer rights that recurses.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- A user may confirm their own platform-admin status; a platform admin may
-- see the whole roster. Nobody can write here through PostgREST — granting
-- platform admin is a service_role operation, deliberately out of band.
drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

grant select on public.platform_admins to authenticated;

-- ---------------------------------------------------------------------
-- 4. Extend SELECT policies with cross-org read
-- ---------------------------------------------------------------------
-- SCOPE NOTE — read this before "completing" the pattern below.
--
-- The brief asked for `OR is_platform_admin()` on every USING clause, with
-- WITH CHECK left alone on contacts/events so super-admins cannot write.
-- Applied literally that is self-defeating: a DELETE policy has ONLY a
-- USING clause and no WITH CHECK, so adding the predicate there grants
-- platform admins DELETE on every tenant's contacts and events — exactly
-- the "casual write into an arbitrary org" the brief rules out.
--
-- So the predicate is added to SELECT policies ONLY. INSERT, UPDATE and
-- DELETE policies are untouched, and because current_org_id() returns NULL
-- for a user with no admin_users row, every write path evaluates to NULL
-- (falsy) for a platform admin. Cross-org access is therefore read-only by
-- construction, not by convention.
--
-- If super-admin writes are wanted later, that is a separate migration with
-- its own explicit policies — not a side effect of this one.

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
  on public.organizations
  for select
  to authenticated
  using (id = public.current_org_id() or public.is_platform_admin());

drop policy if exists admin_users_select_own_org on public.admin_users;
create policy admin_users_select_own_org
  on public.admin_users
  for select
  to authenticated
  using (organization_id = public.current_org_id() or public.is_platform_admin());

drop policy if exists contacts_select_own_org on public.contacts;
create policy contacts_select_own_org
  on public.contacts
  for select
  to authenticated
  using (organization_id = public.current_org_id() or public.is_platform_admin());

drop policy if exists events_select_own_org on public.events;
create policy events_select_own_org
  on public.events
  for select
  to authenticated
  using (organization_id = public.current_org_id() or public.is_platform_admin());

drop policy if exists vim_select_own_org on public.visitor_identity_map;
create policy vim_select_own_org
  on public.visitor_identity_map
  for select
  to authenticated
  using (organization_id = public.current_org_id() or public.is_platform_admin());

-- ---------------------------------------------------------------------
-- 5. Backfill industry for the seeded test orgs
-- ---------------------------------------------------------------------
update public.organizations set industry = 'ecommerce'
  where slug = 'acme-test' and industry is null;
update public.organizations set industry = 'retail'
  where slug = 'rival-test' and industry is null;

-- ---------------------------------------------------------------------
-- IMPORTANT CONSEQUENCE FOR APPLICATION CODE
-- ---------------------------------------------------------------------
-- RLS no longer scopes a platform admin's reads to one org — it cannot,
-- that is the point. Any query run as a platform admin returns rows across
-- ALL tenants unless it filters explicitly. Every dashboard query must
-- therefore carry its own .eq('organization_id', ...) rather than relying
-- on the database to imply it.
