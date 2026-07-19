'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './AppShell';

/**
 * Active state is derived from the real pathname, not passed in.
 *
 * It used to be a hardcoded `activeHref` prop set once per layout, which
 * meant /super-admin/new-org still highlighted "Companies" — the layout
 * renders for the whole subtree and had no idea which child was showing.
 *
 * Matching rule: the LONGEST nav href that the pathname starts with wins.
 * A plain `startsWith` would light up both "Companies" (/super-admin) and
 * "Provision" (/super-admin/new-org) on the provision page, and a plain
 * equality check would leave nothing highlighted on nested routes like
 * /super-admin/org/[id]. Longest-prefix gives the right answer for both:
 * the drill-down still belongs to "Companies", the provision page belongs
 * to "Provision".
 */
export function resolveActiveHref(pathname: string, navItems: NavItem[]): string | null {
  let best: string | null = null;

  for (const item of navItems) {
    const isMatch = pathname === item.href || pathname.startsWith(item.href + '/');
    if (isMatch && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }

  return best;
}

export function SidebarNav({
  navItems,
  collapsed = false,
}: {
  navItems: NavItem[];
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname, navItems);

  return (
    <nav className="mt-6 space-y-1">
      {navItems.map((item) => {
        const active = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${
              active
                ? 'bg-blush-50 font-medium text-blush-800 dark:bg-blush-950/60 dark:text-blush-300'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
            }`}
          >
            <span className="flex-none">{item.icon}</span>
            {collapsed ? null : <span className="truncate">{item.label}</span>}

            {collapsed ? (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-xs text-ink-50 shadow-pop group-hover:block dark:bg-ink-100 dark:text-ink-900"
              >
                {item.label}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
