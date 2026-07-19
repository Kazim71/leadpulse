import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// See server.ts: the cookie contract is an untagged union, so these
// callback params must be annotated rather than inferred.
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the auth session on every request and performs COARSE route
 * gating (is there a session at all?).
 *
 * Deliberately not the security boundary. Middleware cannot safely query
 * platform_admins/admin_users on every request without a DB round-trip per
 * navigation, so the authoritative role check lives in each page's server
 * component via requirePlatformAdmin()/requireOrgAdmin(). Middleware only
 * bounces obviously-unauthenticated traffic to /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) — it revalidates the JWT against Supabase
  // rather than trusting a cookie that a client could have forged.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
