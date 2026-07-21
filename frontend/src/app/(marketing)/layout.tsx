import { DM_Serif_Display } from 'next/font/google';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { CursorGlow } from '@/components/marketing/CursorGlow';

/**
 * Marketing-only display serif, loaded in this NESTED layout rather than
 * the root layout — its generated CSS variable only reaches the five
 * public pages, so the dashboard's own Fraunces headings are completely
 * unaffected. `display: 'swap'` (same pattern as the root layout's fonts)
 * means text renders immediately in a fallback serif and swaps in without
 * a layout shift once the real font loads.
 *
 * WHY DM SERIF DISPLAY (not Bodoni Moda, tried first): Bodoni Moda was the
 * initial pick for its didone, fashion-editorial contrast, but Next.js
 * could not compute fallback-font override metrics for it — verified via
 * `node_modules/next/dist/server/capsize-font-metrics.json`, whose entry
 * for this font is keyed `bodoniModa11pt` (the variable font's true family
 * name includes its optical-size range), not `bodoniModa`, so Next's
 * lookup misses it. Without those override metrics, the fallback-to-
 * webfont swap has no guarantee against a real layout shift — exactly what
 * "no FOUT/layout shift issues" rules out. DM Serif Display passes that
 * same metrics check (confirmed empirically, not assumed), AND is a more
 * deliberate pairing than an arbitrary swap: it's the display companion
 * Google's own "DM" type family ships specifically to pair with DM Sans —
 * the body font already used site-wide — so headline and body now share
 * one coherent type family rather than two unrelated fonts placed
 * side-by-side. It keeps real editorial character (a tall, sharp, high-
 * contrast serif — not a generic default) without the risk Bodoni Moda
 * carried.
 */
const marketingDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-marketing-display',
  display: 'swap',
});

/**
 * Wraps the five public pages only — "/", /about, /contact, /features,
 * /product. A route group ("(marketing)") adds no URL segment, so
 * (marketing)/page.tsx still serves "/" and (marketing)/about/page.tsx
 * still serves "/about". /login, /dashboard, /super-admin sit outside this
 * group and keep their own AppShell chrome, untouched.
 *
 * LIGHT BY DEFAULT, DARK SUPPORTED — REVERSED 2026-07-21, THEN CORRECTED
 * THE SAME DAY. First pass made dark mode use the `marketing.*` Space
 * Indigo palette (the site's original dark-only base). Explicit follow-up
 * feedback: page-level dark mode should match the dashboard's own dark
 * mode exactly (black, not indigo) — `marketing.*` no longer styles the
 * page body/cards at all, only `SiteFooter` (which is Space Indigo
 * UNCONDITIONALLY, in both themes — see SiteFooter.tsx). So this wrapper
 * now uses literal `black`/`white`, identical to `globals.css`'s
 * `body { dark:bg-black dark:text-neutral-200 }` for the dashboard.
 * `ThemeToggle` is still the exact same component/mechanism the dashboard
 * uses (next-themes, persisted preference) — switching themes on `/` and
 * on `/dashboard` is the same action with the same persistence behavior.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${marketingDisplay.variable} flex min-h-screen flex-col bg-white text-black dark:bg-black dark:text-white`}
    >
      <CursorGlow />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
