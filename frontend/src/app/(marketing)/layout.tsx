import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

/**
 * Wraps the five public pages only — "/", /about, /contact, /features,
 * /product. A route group ("(marketing)") adds no URL segment, so
 * (marketing)/page.tsx still serves "/" and (marketing)/about/page.tsx
 * still serves "/about". /login, /dashboard, /super-admin sit outside this
 * group and keep their own AppShell chrome, untouched.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50 dark:bg-ink-950">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
