import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ws from 'ws';

/**
 * @supabase/ssr exposes both a modern (getAll/setAll) and a deprecated
 * (get/set/remove) cookie contract as an untagged union, which TypeScript
 * cannot discriminate from the object literal alone — so the callback
 * params infer as implicit `any`. Annotating explicitly restores safety.
 */
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 *
 * Uses the ANON key, never service_role. This is the critical difference in
 * trust boundary between the dashboard and the Phase 2 ingestion API: the
 * backend is a trusted server that must bypass RLS to write on any tenant's
 * behalf, whereas the dashboard acts AS the logged-in user and must be
 * constrained by exactly the policies that constrain them. Reaching for
 * service_role here would silently delete the entire multi-tenant boundary.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // createClient eagerly builds a RealtimeClient that needs a global
      // WebSocket. Node 22+ has one; Node 20 does not, so without this every
      // Server Component that touches Supabase throws at request time. The
      // dashboard never subscribes to realtime — this just satisfies the
      // constructor. (Middleware runs on the Edge runtime, which has a
      // native WebSocket, so it needs no equivalent.)
      realtime: { transport: ws } as never,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware instead, so this is
            // safe to swallow.
          }
        },
      },
    },
  );
}
