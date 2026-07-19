import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getContactCountsByOrg, getOrganizations } from '@/lib/queries';
import { CompanyGrid } from '@/components/CompanyGrid';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  await requirePlatformAdmin();

  const supabase = createClient();
  const [organizations, contactCounts] = await Promise.all([
    getOrganizations(supabase),
    getContactCountsByOrg(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900 dark:text-ink-50">Companies</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'} on
          the platform
        </p>
      </div>
      <CompanyGrid organizations={organizations} contactCounts={contactCounts} />
    </div>
  );
}
