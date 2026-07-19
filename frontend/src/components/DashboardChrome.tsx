'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { SignOutButton } from './SignOutButton';
import { SidebarNav } from './SidebarNav';
import { NotificationBell } from './NotificationBell';
import { ChevronLeftIcon, CloseIcon, MenuIcon } from './icons';
import type { NavItem } from './AppShell';
import type { ReadySignalLead } from '@/lib/queries';

const COLLAPSE_KEY = 'lc_sidebar_collapsed';

/**
 * Owns sidebar collapse + mobile-drawer state. `children` is the page's own
 * Server Component tree, passed straight through — wrapping it in a client
 * boundary here does not force it to render client-side; Next.js keeps
 * Server Component children rendered on the server even when a Client
 * Component is the one holding them. That's what lets this file be
 * 'use client' without turning every dashboard page into one.
 */
export function DashboardChrome({
  navItems,
  contextLabel,
  contextSublabel,
  email,
  notifications,
  children,
}: {
  navItems: NavItem[];
  contextLabel: string;
  contextSublabel: string;
  email: string;
  notifications: ReadySignalLead[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read the persisted preference after mount only — both server and the
  // client's first render use `collapsed = false`, so there's no hydration
  // mismatch, just a brief expanded-then-collapses flash on repeat visits
  // (same tradeoff class as ThemeToggle, accepted for the same reason).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage disabled — default to expanded */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* storage disabled — state still works for this session */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* ---- desktop sidebar ------------------------------------------- */}
      <aside
        className={`hidden flex-none flex-col border-r border-ink-200 bg-white py-6 transition-[width] duration-150 dark:border-ink-800 dark:bg-ink-900 lg:flex ${
          collapsed ? 'w-[4.5rem] px-2' : 'w-64 px-4'
        }`}
      >
        <div className={collapsed ? 'flex justify-center' : ''}>
          <Brand collapsed={collapsed} />
        </div>

        {collapsed ? null : (
          <div className="mt-8 rounded-lg bg-ink-50 px-3 py-2.5 dark:bg-ink-950/60">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              {contextSublabel}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink-900 dark:text-ink-100">
              {contextLabel}
            </p>
          </div>
        )}

        <SidebarNav navItems={navItems} collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`mt-auto flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <ChevronLeftIcon className={`h-4 w-4 flex-none transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {collapsed ? null : 'Collapse'}
        </button>
      </aside>

      {/* ---- mobile overlay drawer --------------------------------------
          The sidebar is `hidden ... lg:flex` above (unchanged breakpoint —
          it was already responsive-hidden below lg), so below that width
          the only way in is this drawer, opened by the header's hamburger. */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-6 shadow-pop dark:bg-ink-900">
            <div className="flex items-center justify-between">
              <Brand collapsed={false} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="mt-8 rounded-lg bg-ink-50 px-3 py-2.5 dark:bg-ink-950/60">
              <p className="text-2xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
                {contextSublabel}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                {contextLabel}
              </p>
            </div>
            <div onClick={() => setMobileOpen(false)}>
              <SidebarNav navItems={navItems} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center justify-between border-b border-ink-200 bg-white px-4 dark:border-ink-800 dark:bg-ink-900 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden"
            >
              <MenuIcon />
            </button>
            <div className="lg:hidden">
              <Brand collapsed={false} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell leads={notifications} />
            <span className="hidden text-xs text-ink-500 dark:text-ink-400 sm:block">{email}</span>
            <SignOutButton />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blush-600">
        <span className="h-3.5 w-1.5 rounded-full bg-blush-100" />
      </span>
      {collapsed ? null : (
        <span className="font-display text-lg tracking-tight text-ink-900 dark:text-ink-50">
          LeadCapsule
        </span>
      )}
    </div>
  );
}
