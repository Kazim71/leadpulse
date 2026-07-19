import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganization } from '@/lib/queries';
import { AppShell } from '@/components/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate runs before any child renders. organizationId comes from the
  // session's admin_users row — there is no URL param to tamper with.
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const org = await getOrganization(supabase, viewer.organizationId);

  return (
    <AppShell
      navItems={[
        { href: '/dashboard', label: 'Leads' },
        { href: '/dashboard/summary', label: 'Summary' },
      ]}
      activeHref="/dashboard"
      contextLabel={org?.name ?? 'Your organization'}
      contextSublabel="Organization"
      email={viewer.email}
    >
      {children}
    </AppShell>
  );
}
