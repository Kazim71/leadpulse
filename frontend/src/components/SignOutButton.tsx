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
      className="text-xs font-medium text-neutral-500 transition-colors hover:text-cinnamon-700 dark:text-neutral-400 dark:hover:text-cinnamon-400"
    >
      Sign out
    </button>
  );
}
