import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { SignOutButton } from '@/components/SignOutButton';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * The self-signup landing spot. A user with no admin_users row is a normal,
 * expected state — not an error — so this reads as "waiting", not "denied".
 */
export default async function PendingPage() {
  const viewer = await getViewer();

  if (viewer.kind === 'anonymous') redirect('/login');
  if (viewer.kind === 'platform_admin') redirect('/super-admin');
  if (viewer.kind === 'org_admin') redirect('/dashboard');

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <EmptyState
        title="Waiting for organization assignment"
        description={`You're signed in as ${viewer.email}, but your account hasn't been linked to an organization yet. An administrator needs to add you before any lead data becomes visible.`}
        action={<SignOutButton />}
      />
    </div>
  );
}
