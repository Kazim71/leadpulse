import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLeads } from '@/lib/queries';
import { LeadsTable } from '@/components/LeadsTable';

export const dynamic = 'force-dynamic';

/** Page fetches; LeadsTable renders. No Supabase calls inside JSX. */
export default async function LeadsPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const leads = await getLeads(supabase, viewer.organizationId);

  return (
    <div className="space-y-6">
      <PageHeading title="Leads" subtitle={`${leads.length} known ${leads.length === 1 ? 'contact' : 'contacts'}`} />
      <LeadsTable leads={leads} />
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink-900 dark:text-ink-50">{title}</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
    </div>
  );
}
