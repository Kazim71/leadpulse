import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getPlatformReadySignal } from '@/lib/queries';
import { AppShell } from '@/components/AppShell';
import { CompaniesIcon, ProvisionIcon } from '@/components/icons';

/**
 * Gates the ENTIRE /super-admin subtree, including
 * /super-admin/org/[organizationId]. An org admin who types that URL is
 * redirected here before any child page runs a query.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePlatformAdmin();
  const supabase = createClient();
  const readyLeads = await getPlatformReadySignal(supabase);

  return (
    <AppShell
      navItems={[
        { href: '/super-admin', label: 'Companies', icon: <CompaniesIcon /> },
        { href: '/super-admin/new-org', label: 'Provision', icon: <ProvisionIcon /> },
      ]}
      contextLabel="All organizations"
      contextSublabel="Platform"
      email={viewer.email}
      notifications={readyLeads}
    >
      {children}
    </AppShell>
  );
}
