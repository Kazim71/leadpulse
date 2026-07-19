-- =====================================================================
-- leadpulse — Phase 1 verification
-- Paste each section into the Supabase SQL editor and run it. Sections
-- are independent; run them in order.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. Structure landed
-- ---------------------------------------------------------------------
-- Expect 5 rows, all with rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('organizations','admin_users','contacts','events','visitor_identity_map')
order by tablename;

-- Expect 17 policies (1 on organizations, 4 on each of the other four).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Expect the 12 explicitly created indexes (admin_users 1, contacts 6,
-- events 4, visitor_identity_map 1), plus the PK/unique-constraint indexes.
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('organizations','admin_users','contacts','events','visitor_identity_map')
order by tablename, indexname;

-- Helper function exists and is SECURITY DEFINER (prosecdef = true).
select proname, prosecdef, provolatile
from pg_proc
where proname = 'current_org_id';


-- ---------------------------------------------------------------------
-- B. Row counts per table (as postgres — RLS bypassed, sees everything)
-- ---------------------------------------------------------------------
-- After seed.sql: organizations 2, admin_users 1, contacts 3,
-- visitor_identity_map 3, events 8.
select 'organizations'        as table_name, count(*) from public.organizations
union all
select 'admin_users',          count(*) from public.admin_users
union all
select 'contacts',             count(*) from public.contacts
union all
select 'events',               count(*) from public.events
union all
select 'visitor_identity_map', count(*) from public.visitor_identity_map
order by table_name;

-- Per-org breakdown — confirms the seed put rows in both tenants.
select o.slug, count(e.id) as events, count(distinct c.id) as contacts
from public.organizations o
left join public.events   e on e.organization_id = o.id
left join public.contacts c on c.organization_id = o.id
group by o.slug
order by o.slug;


-- ---------------------------------------------------------------------
-- C. RLS — impersonate the Acme admin
-- ---------------------------------------------------------------------
-- Replace 6d08ec3f-fa94-4a1f-8832-6ea2c94d1e23 with the same auth.users UUID used in
-- seed.sql. Run the whole block at once (the settings are transaction-local).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"6d08ec3f-fa94-4a1f-8832-6ea2c94d1e23","role":"authenticated"}';

  -- sanity: should return 11111111-1111-1111-1111-111111111111 (Acme)
  select auth.uid() as acting_user, public.current_org_id() as acting_org;

  -- Expect: organizations 1, admin_users 1, contacts 2, events 7, vim 2.
  -- The Rival org's 1 org row, 1 contact, 1 event and 1 vim row are gone.
  select 'organizations'        as table_name, count(*) from public.organizations
  union all
  select 'admin_users',          count(*) from public.admin_users
  union all
  select 'contacts',             count(*) from public.contacts
  union all
  select 'events',               count(*) from public.events
  union all
  select 'visitor_identity_map', count(*) from public.visitor_identity_map
  order by table_name;

  -- Direct cross-org read attempt — expect 0 rows, not an error.
  select * from public.contacts
  where organization_id = '22222222-2222-2222-2222-222222222222';

  select * from public.events
  where visitor_id = 'vis_rival_001';

  -- Cross-org write attempt — expect:
  --   ERROR: new row violates row-level security policy for table "contacts"
  insert into public.contacts (organization_id, email, name)
  values ('22222222-2222-2222-2222-222222222222', 'leak@rival.dev', 'Should Fail');
rollback;


-- ---------------------------------------------------------------------
-- D. RLS — impersonate a user who is not an admin_user at all
-- ---------------------------------------------------------------------
-- current_org_id() returns null, every policy predicate evaluates to null,
-- so all five counts must be 0. This is the default-deny check.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

  select public.current_org_id() as acting_org;  -- expect null

  select 'organizations'        as table_name, count(*) from public.organizations
  union all
  select 'admin_users',          count(*) from public.admin_users
  union all
  select 'contacts',             count(*) from public.contacts
  union all
  select 'events',               count(*) from public.events
  union all
  select 'visitor_identity_map', count(*) from public.visitor_identity_map
  order by table_name;
rollback;


-- ---------------------------------------------------------------------
-- E. RLS — impersonate a Rival admin (optional, strongest check)
-- ---------------------------------------------------------------------
-- Requires a second auth user: Dashboard -> Authentication -> Users ->
-- "Add user" (e.g. owner@rival-test.dev). Then, as postgres:
--
--   insert into public.admin_users (id, organization_id, email, role)
--   values ('<rival auth uuid>', '22222222-2222-2222-2222-222222222222',
--           'owner@rival-test.dev', 'owner');
--
-- Then run:
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"PASTE_RIVAL_AUTH_USER_UUID_HERE","role":"authenticated"}';

  -- Expect the mirror image of section C:
  -- organizations 1, admin_users 1, contacts 1, events 1, vim 1 — and the
  -- org row returned is rival-test, never acme-test.
  select slug from public.organizations;
  select name from public.contacts;
  select visitor_id, event_type from public.events;
rollback;


-- ---------------------------------------------------------------------
-- F. Constraint checks (all five should ERROR)
-- ---------------------------------------------------------------------
begin;
  -- contacts_phone_or_email: both null
  insert into public.contacts (organization_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'No Identity');
rollback;

begin;
  -- contacts_org_email_uniq: duplicate email inside the same org
  insert into public.contacts (organization_id, email)
  values ('11111111-1111-1111-1111-111111111111', 'priya@example.com');
rollback;

begin;
  -- ...but the same email under a DIFFERENT org must succeed
  insert into public.contacts (organization_id, email)
  values ('22222222-2222-2222-2222-222222222222', 'priya@example.com');
rollback;

begin;
  -- admin_users role check
  insert into public.admin_users (id, organization_id, email, role)
  values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
          'x@acme-test.dev', 'superuser');
rollback;

begin;
  -- contacts message_status check
  update public.contacts set message_status = 'pending'
  where id = 'aaaaaaa1-0000-0000-0000-000000000001';
rollback;


-- ---------------------------------------------------------------------
-- G. Index usage on the two hot query paths
-- ---------------------------------------------------------------------
-- Seed data is tiny so the planner will pick a seq scan; these are here to
-- re-run once there is real volume. Expect events_org_created_at_idx and
-- events_org_visitor_idx respectively.
explain analyze
select * from public.events
where organization_id = '11111111-1111-1111-1111-111111111111'
  and created_at >= now() - interval '7 days'
order by created_at desc
limit 50;

explain analyze
select * from public.events
where organization_id = '11111111-1111-1111-1111-111111111111'
  and visitor_id = 'vis_acme_001';

-- gin index on metadata — find every event touching a given SKU
explain analyze
select id, event_type, created_at from public.events
where organization_id = '11111111-1111-1111-1111-111111111111'
  and metadata @> '{"products":[{"id":"sku-1042"}]}'::jsonb;
