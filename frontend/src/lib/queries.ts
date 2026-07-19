import type { SupabaseClient } from '@supabase/supabase-js';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  created_at: string;
}

export interface LeadEvent {
  id: string;
  event_type: string;
  url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  message_status: string;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
  eventCount: number;
  recentEvents: LeadEvent[];
}

export interface DailyCount {
  /** ISO date, `YYYY-MM-DD`, no time component. */
  date: string;
  count: number;
}

export interface TrendStat {
  current: number;
  previous: number;
  /** null when `previous` is 0 — a percentage change from zero is undefined, not "∞%" or "0%". */
  pctChange: number | null;
}

export interface ReadySignalLead {
  id: string;
  name: string | null;
  city: string | null;
  last_seen: string | null;
  /** Only populated by the platform-wide variant, for the super-admin dropdown. */
  organizationName?: string;
}

export interface OrgSummary {
  contactCount: number;
  eventCount: number;
  anonymousEventCount: number;
  identifiedEventCount: number;
  eventsByType: { type: string; count: number }[];
  topCities: { city: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

/**
 * EVERY query in this file filters organization_id explicitly.
 *
 * That is not redundant with RLS. After migration 0003, a platform admin's
 * SELECT policy permits cross-tenant reads, so an unfiltered query would
 * return every tenant's rows blended together. RLS stops an ORG admin from
 * over-reaching; only the explicit filter keeps a PLATFORM admin's view
 * pinned to the org they actually opened.
 */

export async function getOrganizations(
  supabase: SupabaseClient,
): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, industry, created_at')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to load organizations: ${error.message}`);
  return (data ?? []) as Organization[];
}

export async function getOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, industry, created_at')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load organization: ${error.message}`);
  return (data as Organization) ?? null;
}

/** Contact counts per org, for the super-admin company grid. */
export async function getContactCountsByOrg(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  // One query returning only the org id column, tallied in memory. At seed
  // scale this is trivially cheap; the alternative — a count query per card —
  // is a genuine N+1 that grows with tenant count.
  const { data, error } = await supabase.from('contacts').select('organization_id');

  if (error) throw new Error(`Failed to count contacts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { organization_id: string }[]) {
    counts[row.organization_id] = (counts[row.organization_id] ?? 0) + 1;
  }
  return counts;
}

export async function getLeads(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Lead[]> {
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select(
      'id, name, phone, email, city, state, country, message_status, first_seen, last_seen, created_at',
    )
    .eq('organization_id', organizationId)
    .order('last_seen', { ascending: false, nullsFirst: false });

  if (contactsError) throw new Error(`Failed to load leads: ${contactsError.message}`);
  if (!contacts || contacts.length === 0) return [];

  const contactIds = contacts.map((c) => c.id as string);

  // Two queries total, not one per lead. Events are fetched in a single
  // batched `in` and grouped in memory.
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, contact_id, event_type, url, created_at, metadata')
    .eq('organization_id', organizationId)
    .in('contact_id', contactIds)
    .order('created_at', { ascending: false })
    .limit(500);

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`);

  const byContact = new Map<string, LeadEvent[]>();
  for (const e of (events ?? []) as (LeadEvent & { contact_id: string })[]) {
    const list = byContact.get(e.contact_id) ?? [];
    list.push({
      id: e.id,
      event_type: e.event_type,
      url: e.url,
      created_at: e.created_at,
      metadata: e.metadata,
    });
    byContact.set(e.contact_id, list);
  }

  return contacts.map((c) => {
    const contactEvents = byContact.get(c.id as string) ?? [];
    return {
      ...(c as unknown as Omit<Lead, 'eventCount' | 'recentEvents'>),
      eventCount: contactEvents.length,
      recentEvents: contactEvents.slice(0, 8),
    };
  });
}

export async function getOrgSummary(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgSummary> {
  const [{ count: contactCount }, { data: events }, { data: contacts }] =
    await Promise.all([
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('events')
        .select('event_type, contact_id, city')
        .eq('organization_id', organizationId),
      supabase
        .from('contacts')
        .select('message_status')
        .eq('organization_id', organizationId),
    ]);

  const eventRows = (events ?? []) as {
    event_type: string;
    contact_id: string | null;
    city: string | null;
  }[];

  const typeCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  let anonymous = 0;

  for (const e of eventRows) {
    typeCounts.set(e.event_type, (typeCounts.get(e.event_type) ?? 0) + 1);
    if (e.contact_id === null) anonymous++;
    if (e.city) cityCounts.set(e.city, (cityCounts.get(e.city) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const c of (contacts ?? []) as { message_status: string }[]) {
    statusCounts.set(c.message_status, (statusCounts.get(c.message_status) ?? 0) + 1);
  }

  const sortDesc = <T extends { count: number }>(arr: T[]) =>
    arr.sort((a, b) => b.count - a.count);

  return {
    contactCount: contactCount ?? 0,
    eventCount: eventRows.length,
    anonymousEventCount: anonymous,
    identifiedEventCount: eventRows.length - anonymous,
    eventsByType: sortDesc(
      [...typeCounts.entries()].map(([type, count]) => ({ type, count })),
    ),
    topCities: sortDesc(
      [...cityCounts.entries()].map(([city, count]) => ({ city, count })),
    ).slice(0, 5),
    statusBreakdown: sortDesc(
      [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    ),
  };
}

// =====================================================================
// Added for the dashboard feature-expansion task: charts, trend badges,
// and the notification bell. Bucketing happens in memory rather than via
// a Postgres date_trunc RPC, matching the pattern getOrgSummary already
// established — small enough at current data volume, and it keeps every
// query here a plain PostgREST select rather than introducing a second
// query mechanism.
// =====================================================================

function bucketByDay(timestamps: string[], days: number): DailyCount[] {
  const buckets = new Map<string, number>();

  // Seed every day in the window with 0 so the chart has no gaps — a day
  // with no events must render as a zero point, not a missing one.
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/** Events per day for ONE org, for the org-detail and org-admin charts. */
export async function getEventsOverTime(
  supabase: SupabaseClient,
  organizationId: string,
  days = 14,
): Promise<DailyCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', since.toISOString());

  if (error) throw new Error(`Failed to load event history: ${error.message}`);

  return bucketByDay((data ?? []).map((r) => (r as { created_at: string }).created_at), days);
}

/**
 * Events per day across EVERY org — the one deliberate exception to "every
 * query filters organization_id". This is the super-admin's own aggregate
 * view, not a per-org query masquerading as one; callers MUST be gated by
 * requirePlatformAdmin() before this runs, same as every other cross-org
 * read in this file.
 */
export async function getPlatformEventsOverTime(
  supabase: SupabaseClient,
  days = 14,
): Promise<DailyCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .gte('created_at', since.toISOString());

  if (error) throw new Error(`Failed to load platform event history: ${error.message}`);

  return bucketByDay((data ?? []).map((r) => (r as { created_at: string }).created_at), days);
}

/**
 * Event-count trend: this 7-day window vs. the 7 days before it. Computed
 * from two real `created_at` ranges — never fabricated. `previous === 0`
 * yields `pctChange: null` rather than a nonsensical infinite percentage.
 */
export async function getEventCountTrend(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<TrendStat> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [{ count: current }, { count: previous }] = await Promise.all([
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString()),
  ]);

  const cur = current ?? 0;
  const prev = previous ?? 0;

  return { current: cur, previous: prev, pctChange: prev === 0 ? null : ((cur - prev) / prev) * 100 };
}

/**
 * "Ready to contact" signal for the notification bell.
 *
 * HONEST LIMITATION: `contacts` has no `updated_at` / status-change
 * timestamp (see 0001_init_schema.sql), so there is no way to know exactly
 * when a contact's message_status became 'ready'. What IS real and
 * derivable: contacts currently marked 'ready' who were active (last_seen)
 * within the last 24 hours — i.e. "leads worth contacting who showed up
 * recently," not literally "became ready in the last 24h." That distinction
 * is surfaced in the UI copy, not just this comment.
 */
export async function getReadySignal(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ReadySignalLead[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, city, last_seen')
    .eq('organization_id', organizationId)
    .eq('message_status', 'ready')
    .gte('last_seen', since.toISOString())
    .order('last_seen', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to load ready-lead signal: ${error.message}`);
  return (data ?? []) as ReadySignalLead[];
}

/** Platform-wide variant of getReadySignal(), joined with org name for display. */
export async function getPlatformReadySignal(
  supabase: SupabaseClient,
): Promise<ReadySignalLead[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, city, last_seen, organization_id, organizations(name)')
    .eq('message_status', 'ready')
    .gte('last_seen', since.toISOString())
    .order('last_seen', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to load platform ready-lead signal: ${error.message}`);

  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string | null;
    city: string | null;
    last_seen: string | null;
    organizations: { name: string } | null;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    last_seen: row.last_seen,
    organizationName: row.organizations?.name,
  }));
}
