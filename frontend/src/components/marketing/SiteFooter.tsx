import Link from 'next/link';
import { LogoLockup } from '@/components/Logo';

/**
 * Multi-column footer, per the brief's structural reference. Every link
 * here goes to a route that genuinely exists — no fabricated "Careers" /
 * "Blog" / social links standing in for content that isn't real. /blog and
 * /pricing are explicitly out of scope (per the earlier marketing-site
 * task) and are not linked here for the same reason.
 *
 * Background is explicit `bg-black` — UNCONDITIONALLY, no `dark:` pairing,
 * in EITHER theme. The footer is the one surface that stays black
 * regardless of the page's own light/dark state (which is white vs black
 * elsewhere). `marketing.text`/`textDim`/`textFaint`/`border` below still
 * read well on black — they were tuned to be light values on a dark
 * surface — so they're kept as-is. `forceVariant="dark"` on the lockup
 * pins the white-art logo variant: the footer is always dark, so it
 * always needs the light-on-dark logo regardless of the page theme.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-marketing-border/80 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            {/* Full lockup (monogram + "NorthQu" wordmark). forceVariant
                ="dark" = the white-art variant, since the footer is always
                black regardless of page theme. */}
            <LogoLockup className="h-7" forceVariant="dark" />
          </div>

          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-marketing-textFaint">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/features" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/product" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Product
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-marketing-textFaint">
              Company
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/about" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-marketing-border/60 pt-6">
          <p className="text-xs text-marketing-textFaint">© {new Date().getFullYear()} NorthQu</p>
        </div>
      </div>
    </footer>
  );
}
