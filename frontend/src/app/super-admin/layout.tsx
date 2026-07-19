import { requirePlatformAdmin } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

/**
 * Gates the ENTIRE /super-admin subtree, including
 * /super-admin/org/[organizationId]. An org admin who types that URL is
 * redirected here before any child page runs a query.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePlatformAdmin();

  return (
    <AppShell
      navItems={[
        { href: '/super-admin', label: 'Companies' },
        { href: '/super-admin/new-org', label: 'Provision' },
      ]}
      activeHref="/super-admin"
      contextLabel="All organizations"
      contextSublabel="Platform"
      email={viewer.email}
    >
      {children}
    </AppShell>
  );
}
