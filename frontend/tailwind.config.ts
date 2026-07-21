import type { Config } from 'tailwindcss';

/**
 * NorthQu design tokens.
 *
 * BRAND PALETTE (added on the most recent rebrand — see docs/CHANGELOG.md
 * for the full naming history)
 * --------------------------------------------------------
 * Two candidate palettes were provided for this rebrand, identical except
 * for one accent and one indigo shade:
 *   A: Space Indigo #293049, White, Cinnamon Wood #C67155, Black, Ivory
 *   B: Space Indigo #17274F, White, Wine Plum   #763D44, Black, Ivory
 *
 * CHOSE PALETTE A — Cinnamon Wood. Reasoning: this project has a standing
 * rule (see the pastel-accent rationale below) that no gray/neutral here
 * is ever cold/blue-tinted; Cinnamon Wood is a warm rust that continues
 * that rule, while Wine Plum is a cooler, more muted burgundy that would
 * cut against it. Concretely, Cinnamon Wood (#C67155) is close enough to
 * the marketing site's PRE-EXISTING accent from the prior dark-editorial
 * redesign (#C97B52, a "muted, desaturated rust") that adopting it barely
 * disturbs what's already there visually — it reads as formalizing the
 * existing accent into the real brand color, not replacing it with
 * something unrelated. Palette B's Wine Plum would have meant re-deciding
 * the marketing site's whole warm-toned type/shadow system from scratch.
 * Space Indigo's two variants (#293049 vs #17274F) are both dark
 * blue-violets close enough that the choice was effectively decided by
 * the accent alone.
 *
 * ---------------------------------------------------------------------
 * 2026-07-21 — cross-cutting consistency pass (superseding both notes
 * above): `ink`, `blush`, `lilac`, `mint`, and `peach` are REMOVED. They
 * were never fully propagated — the marketing site got the new brand
 * palette, but `login/`, `dashboard/`, and `super-admin/` kept rendering
 * the old warm-cream `ink` background and old pastel `blush` accent,
 * which is exactly the inconsistency this pass fixes. The whole app now
 * shares ONE rule: white background / black text in light mode, dark
 * background / light text in dark mode, black footer always, Cinnamon
 * Wood (`brand.cinnamon`) for every primary action/button, ivory only for
 * secondary section backgrounds that already intentionally used it.
 * `white`/`black` below are literal Tailwind built-ins (not redefined);
 * secondary/tertiary text and borders use Tailwind's stock `neutral`
 * ramp (also not redefined here — it ships with Tailwind and needed no
 * project-specific warm tint once the brand system existed to carry
 * that job instead).
 *
 * The marketing site's `dark-only` decision is ALSO reversed this pass,
 * per explicit instruction: it now supports both themes via the same
 * `next-themes` toggle the dashboard already used, defaulting to light
 * (white/black/cinnamon).
 *
 * SAME-DAY FOLLOW-UP: page-level dark mode does NOT use `marketing.*`
 * (Space Indigo) — explicit feedback was that marketing's dark mode
 * should match the dashboard's own dark mode exactly (black), not
 * indigo. `marketing.*` below is now scoped to ONE consumer only —
 * `SiteFooter`, which uses it UNCONDITIONALLY (Space Indigo in both
 * light AND dark page-themes, not paired with `dark:`) — Indigo is the
 * footer's permanent color, independent of the page's own theme state.
 * Every other marketing surface (body, header, cards) now shares the
 * dashboard's literal `white`/`black`/`neutral-*` tokens directly rather
 * than going through this namespace.
 *
 * `blush`'s old categorical role (one of four rotating hues for status
 * badges / category tags / chart bars) is now filled by three Tailwind
 * stock hues — `violet` (was `lilac`), `emerald` (was `mint`), `amber`
 * (was `peach`) — not four. `blush` itself is not replaced 1:1 in that
 * rotation: it was ALSO documented as "PRIMARY" (the single brand accent)
 * before Cinnamon Wood existed, and reusing `cinnamon` there would
 * reintroduce the exact problem that rotation was built to avoid — "one
 * hue carrying five meanings" — since cinnamon is now reserved
 * exclusively for primary actions/buttons. Everywhere `StatCard`/`Badge`
 * need to highlight something as "the primary one" (e.g. the lead
 * "Contacts" stat), `tone="cinnamon"` is available explicitly — same
 * pattern `brick` (errors) already used: declared, usable by name, never
 * auto-assigned by the category-hash rotation.
 */
// The five raw NorthQu brand colors, defined once so `marketing.*` (and,
// later, the dashboard re-theme) derive from these rather than repeating
// hex literals. Kept as a plain object outside `colors` so values below
// can reference each other in comments/derivation without Tailwind's
// config type getting in the way.
const brand = {
  indigo: '#293049', // Space Indigo — dark base / secondary accent
  white: '#FFFFFF', // primary background (light surfaces)
  cinnamon: '#C67155', // Cinnamon Wood — primary accent: CTAs, hover/active
  cinnamonHover: '#CF866F', // Cinnamon Wood lightened ~15% toward white
  black: '#000000', // footer background, site-wide; primary dark text
  ivory: '#F6F6E9', // secondary section/card background; warm off-white text
};

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- NorthQu brand tokens (this rebrand) ------------------------
        // Named tokens, not raw hex scattered through components. The
        // dashboard re-theme (queued next) is expected to consume these
        // directly as its light-mode base.
        brand,

        // ---- Cinnamon Wood ramp ------------------------------------------
        // Full 50→950 ramp (not just the base + hover already on `brand`)
        // so every existing shade of the old `blush` primary-accent usage
        // (bg-*-600 buttons, text-*-700 links, bg-*-100/dark:bg-*-950
        // badge surfaces, focus rings, ...) has a direct replacement.
        // Same lightness distribution as the old `blush` ramp it replaces,
        // recentered on Cinnamon Wood's hue (~14°) instead of blush's dusty
        // pink (~350°); 500 is deliberately `brand.cinnamon` itself so the
        // ramp and the single named brand color agree exactly.
        cinnamon: {
          50: '#FDF4F1',
          100: '#FAE6DE',
          200: '#F4CCBB',
          300: '#E9AB8C',
          400: '#DA8B66',
          500: '#C67155',
          600: '#B0603F',
          700: '#8F4A32',
          800: '#763D29',
          900: '#633423',
          950: '#371B10',
        },

        // ---- destructive only, kept out of the accent family ------------
        brick: {
          100: '#F9E3E0',
          300: '#E8A79E',
          500: '#C0523F',
          700: '#8B3626',
          900: '#4C1E16',
        },

        // ---- marketing site: SiteFooter's permanent (unconditional) colors ----
        // NOT a page-wide dark-mode variant (that idea was tried, then
        // corrected same-day — see the note atop this file). `bg` is used
        // by exactly one consumer, `SiteFooter`, WITHOUT a `dark:` pairing
        // — Space Indigo is the footer's color in both the site's light
        // and dark states, since the footer is the one surface that
        // doesn't follow the page's own light/black theme switch.
        // `text`/`textDim`/`textFaint`/`border` are also footer-only now
        // (same reason: contrast-tuned against Indigo specifically, which
        // only the footer still uses as a background). `accent`/
        // `accentHover` (Cinnamon Wood) remain general-purpose — e.g.
        // CursorGlow's ring — since the accent color itself didn't change.
        //   bg          — Space Indigo (`brand.indigo`), SiteFooter's
        //                  background, unconditionally.
        //   surface / surfaceHover — indigo lightened ~8%/~14% toward
        //                  white; currently unused (no footer sub-panel
        //                  needs an elevated surface yet) but kept as the
        //                  obvious next step if one is added.
        //   border      — indigo lightened ~20%; SiteFooter's hairline
        //                  dividers.
        //   text        — Ivory (`brand.ivory`), SiteFooter's primary copy
        //                  (the logo's implicit color context).
        //   textDim     — ivory blended 60/40 toward indigo; SiteFooter's
        //                  nav links.
        //   textFaint   — ivory blended 55/45 toward indigo; SiteFooter's
        //                  column labels and copyright line. Blended less
        //                  than `text`/`textDim` (60% ivory) so the
        //                  dim→faint hierarchy still holds, but blended
        //                  MORE than an initial 35% pass — that first
        //                  value measured at 2.83:1 against `bg`, failing
        //                  even WCAG AA-large (3:1); 55% clears AA-normal
        //                  (4.5:1) with margin (see
        //                  test/verify-theme-consistency.mjs).
        //   accent      — Cinnamon Wood (`brand.cinnamon`), used SPARINGLY
        //                  for decorative accents (e.g. CursorGlow's ring).
        //   accentHover — `brand.cinnamonHover`.
        marketing: {
          bg: brand.indigo,
          surface: '#3A4158',
          surfaceHover: '#474D62',
          border: '#54596D',
          text: brand.ivory,
          textDim: '#A4A7A9',
          textFaint: '#9A9DA1',
          accent: brand.cinnamon,
          accentHover: brand.cinnamonHover,
        },
      },
      fontFamily: {
        // Serif display for headings only — the single strongest signal
        // that this was designed rather than scaffolded. Kept out of the
        // data layer, where it would hurt scanning.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Marketing-only display serif — see (marketing)/layout.tsx for
        // why this is a second, distinct serif rather than reusing
        // `display` (Fraunces): the dashboard keeps Fraunces, so the
        // public site gets its own type identity instead of the two
        // surfaces sharing a headline font by accident.
        marketingDisplay: ['var(--font-marketing-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Tighter than Tailwind's defaults. Dashboards are read at a
        // distance of one arm and reward density over airiness.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.9375rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem', { lineHeight: '2.875rem', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        // Squared-off rather than pill-shaped. Fully rounded corners are
        // the other tell of a default-styled component library.
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      spacing: {
        // Adds the half-steps a dense table layout actually needs.
        4.5: '1.125rem',
        13: '3.25rem',
        18: '4.5rem',
        88: '22rem',
      },
      boxShadow: {
        // Warm-tinted shadows. Black shadows over parchment look like dirt.
        card: '0 1px 2px 0 rgb(58 54 48 / 0.04), 0 1px 3px 0 rgb(58 54 48 / 0.06)',
        raised: '0 2px 4px -1px rgb(58 54 48 / 0.06), 0 4px 12px -2px rgb(58 54 48 / 0.08)',
        pop: '0 8px 24px -6px rgb(58 54 48 / 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
