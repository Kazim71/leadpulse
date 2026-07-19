import type { ReactNode } from 'react';
import { DashboardChrome } from './DashboardChrome';
import type { ReadySignalLead } from '@/lib/queries';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

/**
 * Server component: receives already-resolved nav items, identity strings,
 * and notification data as props — nothing about who you are, or what
 * they're allowed to see, is decided in the browser. All interactive
 * chrome (collapse, mobile drawer, the bell dropdown) lives in
 * DashboardChrome, a client component that receives this data and wraps
 * `children` without forcing it to render client-side.
 */
export function AppShell({
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
  return (
    <DashboardChrome
      navItems={navItems}
      contextLabel={contextLabel}
      contextSublabel={contextSublabel}
      email={email}
      notifications={notifications}
    >
      {children}
    </DashboardChrome>
  );
}
