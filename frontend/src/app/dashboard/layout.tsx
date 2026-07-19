import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganization, getReadySignal } from '@/lib/queries';
import { AppShell } from '@/components/AppShell';
import { LeadsIcon, SummaryIcon } from '@/components/icons';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate runs before any child renders. organizationId comes from the
  // session's admin_users row — there is no URL param to tamper with.
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const [org, readyLeads] = await Promise.all([
    getOrganization(supabase, viewer.organizationId),
    getReadySignal(supabase, viewer.organizationId),
  ]);

  return (
    <AppShell
      navItems={[
        { href: '/dashboard', label: 'Leads', icon: <LeadsIcon /> },
        { href: '/dashboard/summary', label: 'Summary', icon: <SummaryIcon /> },
      ]}
      contextLabel={org?.name ?? 'Your organization'}
      contextSublabel="Organization"
      email={viewer.email}
      notifications={readyLeads}
    >
      {children}
    </AppShell>
  );
}
