import type { Config } from 'tailwindcss';

/**
 * LeadCapsule design tokens.
 *
 * PALETTE RATIONALE
 * -----------------
 * The base is unchanged and deliberately so: a warm, brown-tinted neutral
 * ramp (`ink`) over cream surfaces. Every generic dashboard palette — navy
 * +gold, mint fintech, purple gradient — is COLD, and the quiet decision
 * that keeps this one from reading as templated is that no gray here is
 * blue. That stays.
 *
 * WHAT CHANGED: the previous palette had a single terracotta accent doing
 * every job at once — primary actions, active nav, status badges, category
 * tags, and chart bars. One hue carrying five meanings means color conveys
 * nothing; everything is just "the accent". It now resolves into a family
 * of four soft pastels that sit on the warm base like paper tags on kraft
 * card:
 *
 *   blush   — dusty pink.  PRIMARY. Actions, active nav, focus rings, brand
 *             mark, link hovers. Warm enough to belong to the cream base
 *             while being clearly its own hue rather than a darker cream.
 *   lilac   — lavender.    The one cool note. Cool-on-warm is what makes a
 *             pastel-block layout read as designed rather than tonal, and
 *             it carries "handled / done" states.
 *   mint    — soft green.  Healthy/ready states. Desaturated and slightly
 *             grey so it stays a pastel, never the fintech success toast.
 *   peach   — warm apricot. Waiting/caution states and one-time secrets.
 *             Inherits the warmth the old terracotta used to supply, but
 *             now as one voice among four instead of the only one.
 *
 * Each accent is a full 50→950 ramp rather than a single tint, because
 * pastels do not survive dark mode by being lightened — washed-out pastel
 * on near-black is illegible and loses all hue identity. The pattern used
 * throughout is: LIGHT = 100 surface + 800 text; DARK = 950 surface + 300
 * text. Both ends stay saturated enough to read as the same colour, so a
 * mint badge is recognisably mint in either theme.
 *
 * `brick` remains for destructive/error only. It is intentionally NOT part
 * of the accent family — an error must never be mistakable for a category
 * tag.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- warm neutral base (unchanged) ----------------------------
        ink: {
          50: '#F8F7F5',
          100: '#F1EEE9',
          200: '#E3DED6',
          300: '#CEC7BB',
          400: '#A9A093',
          500: '#877D6F',
          600: '#6C6357',
          700: '#575046',
          800: '#46413A',
          900: '#2F2C27',
          950: '#1A1815',
        },

        // ---- pastel accent family --------------------------------------
        blush: {
          50: '#FDF4F5',
          100: '#FAE7EA',
          200: '#F4CDD4',
          300: '#E9A9B5',
          400: '#DA8093',
          500: '#C75F77',
          600: '#B04A62',
          700: '#8F3B50',
          800: '#763343',
          900: '#632E3A',
          950: '#37151C',
        },
        lilac: {
          50: '#F7F5FC',
          100: '#EFEBF9',
          200: '#DFD7F2',
          300: '#C7B9E7',
          400: '#AB96D8',
          500: '#9075C6',
          600: '#785BAE',
          700: '#63498F',
          800: '#533E75',
          900: '#463661',
          950: '#281C3A',
        },
        mint: {
          50: '#F1FAF6',
          100: '#DFF3EA',
          200: '#BFE6D5',
          300: '#93D3B8',
          400: '#63BA97',
          500: '#3F9E7B',
          600: '#2E8064',
          700: '#276651',
          800: '#235243',
          900: '#1F4439',
          950: '#0E2620',
        },
        peach: {
          50: '#FEF6F0',
          100: '#FCEADD',
          200: '#F8D2BA',
          300: '#F1B28C',
          400: '#E88C5B',
          500: '#DC6D38',
          600: '#C5552A',
          700: '#A34124',
          800: '#843725',
          900: '#6D3021',
          950: '#3A1610',
        },

        // ---- destructive only, kept out of the accent family ------------
        brick: {
          100: '#F9E3E0',
          300: '#E8A79E',
          500: '#C0523F',
          700: '#8B3626',
          900: '#4C1E16',
        },
      },
      fontFamily: {
        // Serif display for headings only — the single strongest signal
        // that this was designed rather than scaffolded. Kept out of the
        // data layer, where it would hurt scanning.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
