import Link from 'next/link';
import { LogoLockup } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/product', label: 'Product' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Shared across all five public pages via (marketing)/layout.tsx.
 *
 * STICKY, not static: `sticky top-0 z-40` — the earlier version had no
 * position class at all, so it simply scrolled away with the page, and
 * its `bg-marketing-bg/85 backdrop-blur` (styling clearly meant for a
 * header staying put over scrolling content) never had a chance to do
 * anything. `z-40` sits below CursorGlow's `z-[100]` (a decorative
 * overlay that should stay on top of everything) but above ordinary page
 * content.
 *
 * LIGHT MODE IS NOW THE DEFAULT (see (marketing)/layout.tsx for the full
 * reversal of the earlier "dark-only" decision) — `ThemeToggle` is the
 * same component/mechanism the dashboard already used (next-themes,
 * persisted to localStorage), not a second implementation.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800/80 dark:bg-black/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <LogoLockup className="h-7" />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-600 transition-colors hover:text-black dark:text-neutral-400 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full bg-cinnamon-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Small-screen nav: the sm:flex row above hides below that
          breakpoint, so the links get a second row instead of a hamburger
          drawer — four text links don't need overlay chrome. */}
      <nav className="flex items-center gap-5 overflow-x-auto border-t border-neutral-200 px-6 py-2.5 dark:border-neutral-800/60 sm:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-none text-sm text-neutral-600 dark:text-neutral-400"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
