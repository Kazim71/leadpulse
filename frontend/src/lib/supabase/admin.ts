// Importing this file from a Client Component is a BUILD ERROR, not a
// runtime surprise. That guard is the whole reason this module exists as a
// separate file from server.ts: everything else in the dashboard uses the
// anon key and is constrained by RLS, and this one deliberately is not.
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * Service-role Supabase client. BYPASSES RLS ENTIRELY.
 *
 * Only two operations legitimately need it, and both are platform-admin
 * provisioning actions that no tenant-scoped policy could ever express:
 *   - creating an auth user (auth.admin.* is service-role-only by design)
 *   - inserting the organizations / admin_users rows that BOOTSTRAP a
 *     tenant, which by definition cannot be authorized by that tenant's
 *     own policies because the tenant does not exist yet.
 *
 * Every caller must independently verify the requester is a platform admin
 * BEFORE using this client — RLS will not do it for them here.
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so Next.js will not
 * inline it into the client bundle.
 */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to frontend/.env.local ' +
        '(server-side only — never prefix it with NEXT_PUBLIC_).',
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Node 20 has no global WebSocket; see server.ts.
    realtime: { transport: ws } as never,
  });
}
