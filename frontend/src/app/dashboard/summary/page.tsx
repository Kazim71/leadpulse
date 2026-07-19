import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrgSummary } from '@/lib/queries';
import { SummaryPanel } from '@/components/SummaryPanel';

export const dynamic = 'force-dynamic';

export default async function SummaryPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const summary = await getOrgSummary(supabase, viewer.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900 dark:text-ink-50">Summary</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Aggregate activity across your storefront.
        </p>
      </div>
      <SummaryPanel summary={summary} />
    </div>
  );
}
