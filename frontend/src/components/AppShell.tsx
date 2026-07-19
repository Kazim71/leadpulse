import type { ReactNode } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { SignOutButton } from './SignOutButton';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Sidebar + top bar frame shared by both the org-admin and super-admin
 * views. Server component: it receives already-resolved nav items and
 * identity strings, so nothing about who you are is decided in the browser.
 */
export function AppShell({
  navItems,
  activeHref,
  contextLabel,
  contextSublabel,
  email,
  children,
}: {
  navItems: NavItem[];
  activeHref: string;
  contextLabel: string;
  contextSublabel: string;
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-none border-r border-ink-200 bg-white px-4 py-6 dark:border-ink-800 dark:bg-ink-900 lg:block">
        <Brand />

        <div className="mt-8 rounded-lg bg-ink-50 px-3 py-2.5 dark:bg-ink-950/60">
          <p className="text-2xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {contextSublabel}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink-900 dark:text-ink-100">
            {contextLabel}
          </p>
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-blush-50 font-medium text-blush-800 dark:bg-blush-950/60 dark:text-blush-300'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center justify-between border-b border-ink-200 bg-white px-6 dark:border-ink-800 dark:bg-ink-900">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-xs text-ink-500 dark:text-ink-400 sm:block">{email}</span>
            <SignOutButton />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      {/* The mark is a capsule — a filled blush lozenge with a lighter core. */}
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blush-600">
        <span className="h-3.5 w-1.5 rounded-full bg-blush-100" />
      </span>
      <span className="font-display text-lg tracking-tight text-ink-900 dark:text-ink-50">
        LeadCapsule
      </span>
    </div>
  );
}
