import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { LogoLockup } from '@/components/Logo';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoLockup className="h-8" />
        </div>
        <h1 className="font-display text-3xl text-black dark:text-white">Create an account</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Signing up does not grant access to any organization. An administrator links your
          account before lead data becomes visible.
        </p>
        <div className="mt-7">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-cinnamon-700 hover:underline dark:text-cinnamon-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
