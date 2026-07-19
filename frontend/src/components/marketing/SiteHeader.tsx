import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/product', label: 'Product' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Shared across all five public pages via (marketing)/layout.tsx. Plain
 * server component — nothing here is interactive except the pre-existing
 * ThemeToggle, so there's no reason to ship it as client JS.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-ink-200 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blush-600">
            <span className="h-3.5 w-1.5 rounded-full bg-blush-100" />
          </span>
          <span className="font-display text-lg tracking-tight text-ink-900 dark:text-ink-50">
            LeadCapsule
          </span>
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-600 transition-colors hover:text-blush-700 dark:text-ink-300 dark:hover:text-blush-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-md bg-blush-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blush-700"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Small-screen nav: the sm:flex row above hides below that
          breakpoint, so the links get a second row instead of a hamburger
          drawer — four text links don't need overlay chrome. */}
      <nav className="flex items-center gap-5 overflow-x-auto border-t border-ink-100 px-6 py-2.5 dark:border-ink-900 sm:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-none text-sm text-ink-600 dark:text-ink-300"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
