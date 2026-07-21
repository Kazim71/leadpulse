import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizations } from '@/lib/queries';
import { ProvisionForms } from '@/components/ProvisionForms';

export const dynamic = 'force-dynamic';

/**
 * Server-gated page. The Route Handlers behind these forms re-check
 * authorization independently — this gate stops the page rendering, but it
 * is NOT what secures the endpoints.
 */
export default async function NewOrgPage() {
  await requirePlatformAdmin();

  const supabase = createClient();
  const organizations = await getOrganizations(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Provision</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Onboard a new company, then give its team a way in.
        </p>
      </div>
      <ProvisionForms organizations={organizations} />
    </div>
  );
}
