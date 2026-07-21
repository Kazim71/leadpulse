import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getContactCountsByOrg, getOrganizations, getPlatformEventsOverTime } from '@/lib/queries';
import { CompanyGrid } from '@/components/CompanyGrid';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EventsOverTimeChart } from '@/components/charts/EventsOverTimeChart';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  await requirePlatformAdmin();

  const supabase = createClient();
  const [organizations, contactCounts, platformEvents] = await Promise.all([
    getOrganizations(supabase),
    getContactCountsByOrg(supabase),
    // Cross-org aggregate — the one deliberate exception to "every query
    // filters organization_id", documented in queries.ts. This is the
    // platform-wide view the super-admin role exists to see.
    getPlatformEventsOverTime(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Companies</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'} on
          the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg text-black dark:text-neutral-100">
            Events across all organizations, last {platformEvents.length} days
          </h2>
        </CardHeader>
        <CardBody>
          <EventsOverTimeChart data={platformEvents} />
        </CardBody>
      </Card>

      <CompanyGrid organizations={organizations} contactCounts={contactCounts} />
    </div>
  );
}
