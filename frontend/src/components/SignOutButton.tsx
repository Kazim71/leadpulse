'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="text-xs font-medium text-ink-500 transition-colors hover:text-blush-700 dark:text-ink-400 dark:hover:text-blush-400"
    >
      Sign out
    </button>
  );
}
