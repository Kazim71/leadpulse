import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getEventCountTrend, getEventsOverTime, getOrgSummary } from '@/lib/queries';
import { SummaryPanel } from '@/components/SummaryPanel';

export const dynamic = 'force-dynamic';

export default async function SummaryPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const [summary, eventsOverTime, eventTrend] = await Promise.all([
    getOrgSummary(supabase, viewer.organizationId),
    getEventsOverTime(supabase, viewer.organizationId),
    getEventCountTrend(supabase, viewer.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Summary</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Aggregate activity across your storefront.
        </p>
      </div>
      <SummaryPanel summary={summary} eventsOverTime={eventsOverTime} eventTrend={eventTrend} />
    </div>
  );
}
