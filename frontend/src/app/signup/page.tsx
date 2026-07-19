import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blush-600">
            <span className="h-4 w-1.5 rounded-full bg-blush-100" />
          </span>
          <span className="font-display text-xl tracking-tight text-ink-900 dark:text-ink-50">
            LeadCapsule
          </span>
        </div>
        <h1 className="font-display text-3xl text-ink-900 dark:text-ink-50">Create an account</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          Signing up does not grant access to any organization. An administrator links your
          account before lead data becomes visible.
        </p>
        <div className="mt-7">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-6 text-center text-xs text-ink-500 dark:text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blush-700 hover:underline dark:text-blush-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
