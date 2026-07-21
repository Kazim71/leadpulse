import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  getEventCountTrend,
  getEventsOverTime,
  getLeads,
  getOrganization,
  getOrgSummary,
} from '@/lib/queries';
import { LeadsTable } from '@/components/LeadsTable';
import { SummaryPanel } from '@/components/SummaryPanel';

export const dynamic = 'force-dynamic';

/**
 * Same LeadsTable and SummaryPanel components as the org-admin view — the
 * only difference is where organizationId comes from (URL param here,
 * session there). The param is safe ONLY because requirePlatformAdmin()
 * runs first and the parent layout gates the whole subtree.
 */
export default async function SuperAdminOrgPage({
  params,
}: {
  params: { organizationId: string };
}) {
  await requirePlatformAdmin();

  const supabase = createClient();
  const org = await getOrganization(supabase, params.organizationId);

  // A platform admin can read every org, so a miss here means the id is
  // genuinely bogus rather than merely forbidden.
  if (!org) notFound();

  const [leads, summary, eventsOverTime, eventTrend] = await Promise.all([
    getLeads(supabase, params.organizationId),
    getOrgSummary(supabase, params.organizationId),
    getEventsOverTime(supabase, params.organizationId),
    getEventCountTrend(supabase, params.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/super-admin"
          className="text-xs font-medium text-neutral-500 transition-colors hover:text-cinnamon-700 dark:text-neutral-400 dark:hover:text-cinnamon-400"
        >
          ← All companies
        </Link>
        <h1 className="mt-2 font-display text-3xl text-black dark:text-white">{org.name}</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {org.industry ?? 'Uncategorized'} · {org.slug}
        </p>
      </div>

      <SummaryPanel summary={summary} eventsOverTime={eventsOverTime} eventTrend={eventTrend} />

      <div>
        <h2 className="mb-4 font-display text-2xl text-black dark:text-white">Leads</h2>
        <LeadsTable leads={leads} />
      </div>
    </div>
  );
}
