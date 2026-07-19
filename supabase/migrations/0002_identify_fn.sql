-- =====================================================================
-- leadpulse — Phase 2: identify_visitor()
--
-- Why this lives in the database rather than in identify.service.ts:
-- the three writes (upsert contact, upsert identity map, backfill events)
-- must be all-or-nothing. supabase-js speaks to PostgREST over HTTP, so
-- each client call is its own transaction and there is no BEGIN/COMMIT to
-- reach from Node. A plpgsql function runs as one statement, so it is
-- atomic without any client-side coordination.
-- =====================================================================

create or replace function public.identify_visitor(
  p_organization_id uuid,
  p_visitor_id      text,
  p_phone           text default null,
  p_email           text default null,
  p_name            text default null,
  p_city            text default null,
  p_state           text default null,
  p_country         text default null,
  p_pincode         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contact_id    uuid;
  v_linked_events integer;
begin
  if p_phone is null and p_email is null then
    raise exception 'identify requires phone or email'
      using errcode = '22023';
  end if;

  -- Find an existing contact in this org by phone OR email.
  -- Phone wins when both match different contacts: it is the stronger
  -- identifier for this product (SMS outreach is the downstream action).
  -- TODO(phase 5): a phone match and an email match landing on two
  -- different contact rows is a genuine merge conflict. Today we attach to
  -- the phone match and let the UPDATE below fail on the unique index if
  -- the email is already taken. A real merge (fold B into A, repoint
  -- events and identity map) needs its own endpoint and an audit trail.
  select c.id
    into v_contact_id
    from public.contacts c
   where c.organization_id = p_organization_id
     and (
           (p_phone is not null and c.phone = p_phone)
        or (p_email is not null and c.email = p_email)
         )
   order by (p_phone is not null and c.phone = p_phone) desc,
            c.created_at asc
   limit 1;

  if v_contact_id is null then
    insert into public.contacts
      (organization_id, phone, email, name, city, state, country, pincode,
       first_seen, last_seen)
    values
      (p_organization_id, p_phone, p_email, p_name, p_city, p_state,
       p_country, p_pincode, now(), now())
    returning id into v_contact_id;
  else
    -- Never overwrite a known identifier with null, and never clobber a
    -- phone/email we already hold — /identify is called repeatedly with
    -- partial data as the visitor reveals more.
    update public.contacts c
       set phone      = coalesce(c.phone, p_phone),
           email      = coalesce(c.email, p_email),
           name       = coalesce(p_name, c.name),
           city       = coalesce(p_city, c.city),
           state      = coalesce(p_state, c.state),
           country    = coalesce(p_country, c.country),
           pincode    = coalesce(p_pincode, c.pincode),
           first_seen = least(coalesce(c.first_seen, now()), now()),
           last_seen  = now()
     where c.id = v_contact_id;
  end if;

  -- One visitor_id maps to exactly one contact per org (PK enforces it).
  -- Re-pointing is allowed: a shared device can change hands.
  insert into public.visitor_identity_map
    (visitor_id, organization_id, contact_id)
  values
    (p_visitor_id, p_organization_id, v_contact_id)
  on conflict (visitor_id, organization_id)
  do update set contact_id = excluded.contact_id;

  -- Backfill: single set-based UPDATE, never a loop over fetched rows.
  -- Served by events_org_visitor_idx.
  update public.events e
     set contact_id = v_contact_id
   where e.organization_id = p_organization_id
     and e.visitor_id      = p_visitor_id
     and e.contact_id is null;

  get diagnostics v_linked_events = row_count;

  return jsonb_build_object(
    'contact_id',    v_contact_id,
    'linked_events', v_linked_events
  );
end;
$$;

-- Returns jsonb rather than `returns table (contact_id uuid, ...)` on
-- purpose: named table outputs collide with the identically named columns
-- referenced inside the body and produce "column reference is ambiguous".

revoke all on function public.identify_visitor(
  uuid, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.identify_visitor(
  uuid, text, text, text, text, text, text, text, text
) to service_role;
