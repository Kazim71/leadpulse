import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { LogoLockup } from '@/components/Logo';

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see who's been on your storefront."
      footer={
        <>
          No account?{' '}
          <Link href="/signup" className="font-medium text-cinnamon-700 hover:underline dark:text-cinnamon-400">
            Create one
          </Link>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoLockup className="h-8" />
        </div>
        <h1 className="font-display text-3xl text-black dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{footer}</p>
      </div>
    </div>
  );
}
