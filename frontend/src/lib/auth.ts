import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Who is looking at this page, and what may they see.
 *
 * The four states are exhaustive and mutually exclusive. `unassigned` is a
 * real, expected state — not an error — because self-signup creates an auth
 * user with no admin_users row by design.
 */
export type Viewer =
  | { kind: 'platform_admin'; userId: string; email: string }
  | { kind: 'org_admin'; userId: string; email: string; organizationId: string; role: string }
  | { kind: 'unassigned'; userId: string; email: string }
  | { kind: 'anonymous' };

export async function getViewer(): Promise<Viewer> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: 'anonymous' };

  const email = user.email ?? '';

  // platform_admins is checked FIRST and wins. A user in both tables would
  // otherwise get an ambiguous landing page.
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (platformAdmin) {
    return { kind: 'platform_admin', userId: user.id, email };
  }

  // organization_id comes from the database keyed on the session's user id.
  // It is never read from a URL param, form field, or header — that is the
  // whole reason an org admin cannot look at another tenant.
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (adminUser) {
    return {
      kind: 'org_admin',
      userId: user.id,
      email,
      organizationId: adminUser.organization_id as string,
      role: (adminUser.role as string) ?? 'admin',
    };
  }

  return { kind: 'unassigned', userId: user.id, email };
}

/**
 * Server-side gate for /super-admin/**.
 *
 * This is the actual enforcement for DONE WHEN #3. Hiding the nav link is
 * cosmetic; an org admin typing the URL directly lands here and is bounced
 * before any data is fetched. RLS is the second line of defence underneath:
 * even if this check were removed, the SELECT policies still only grant
 * cross-org reads to is_platform_admin().
 */
export async function requirePlatformAdmin(): Promise<
  Extract<Viewer, { kind: 'platform_admin' }>
> {
  const viewer = await getViewer();

  if (viewer.kind === 'anonymous') redirect('/login');
  if (viewer.kind === 'org_admin') redirect('/dashboard');
  if (viewer.kind === 'unassigned') redirect('/pending');

  return viewer;
}

/** Server-side gate for /dashboard/**. */
export async function requireOrgAdmin(): Promise<
  Extract<Viewer, { kind: 'org_admin' }>
> {
  const viewer = await getViewer();

  if (viewer.kind === 'anonymous') redirect('/login');
  if (viewer.kind === 'platform_admin') redirect('/super-admin');
  if (viewer.kind === 'unassigned') redirect('/pending');

  return viewer;
}

/**
 * Route Handler variant of requirePlatformAdmin().
 *
 * Returns the viewer or null instead of redirecting — an API route must
 * answer with a 403 status, not an HTML redirect. This is the authoritative
 * check for the admin routes: the UI hiding a form proves nothing, since
 * anyone can POST to the endpoint directly.
 */
export async function getPlatformAdminOrNull(): Promise<
  Extract<Viewer, { kind: 'platform_admin' }> | null
> {
  const viewer = await getViewer();
  return viewer.kind === 'platform_admin' ? viewer : null;
}
