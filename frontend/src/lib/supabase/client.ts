'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. ANON key only — RLS is the access control.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
