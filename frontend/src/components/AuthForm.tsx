'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Email/password auth against Supabase Auth.
 *
 * Note what this component does NOT do: it never decides where you land.
 * It signs you in and calls router.refresh(), then the server component at
 * "/" resolves the role from the database and redirects. Deciding the
 * destination here would mean trusting the browser with an authorization
 * decision.
 */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const supabase = createClient();

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      setPending(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // With email confirmation enabled there is no session yet.
      if (!data.session) {
        setNotice('Check your email to confirm your account, then sign in.');
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }
    }

    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
      />

      {error ? (
        <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-cinnamon-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-cinnamon-400 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
      />
    </label>
  );
}
