/**
 * Pastel accent surfaces.
 *
 * Each tone pairs a 100-level surface with 800-level text in light mode, and
 * a 950-level surface with 300-level text in dark. Pastels do not survive
 * dark mode by simply being lightened — a washed 200-tint on near-black
 * loses its hue and reads as grey — so each tone crosses to the opposite
 * end of its own ramp rather than dimming in place.
 */
const TONES = {
  neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  blush: 'bg-blush-100 text-blush-800 dark:bg-blush-950 dark:text-blush-300',
  lilac: 'bg-lilac-100 text-lilac-800 dark:bg-lilac-950 dark:text-lilac-300',
  mint: 'bg-mint-100 text-mint-800 dark:bg-mint-950 dark:text-mint-300',
  peach: 'bg-peach-100 text-peach-800 dark:bg-peach-950 dark:text-peach-300',
  brick: 'bg-brick-100 text-brick-700 dark:bg-brick-900 dark:text-brick-300',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-2xs font-medium uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * message_status -> tone. Kept here so every table renders it identically.
 *
 * The four states now map to four distinct hues instead of three tints of a
 * single accent, so status is readable from colour alone when scanning the
 * column: mint = actionable now, peach = waiting, lilac = already handled,
 * neutral = nothing to do.
 */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'ready':
      return 'mint';
    case 'cooldown':
      return 'peach';
    case 'messaged':
      return 'lilac';
    default:
      return 'neutral';
  }
}

/** Accent rotation shared by category tags and chart series. */
export const ACCENT_TONES: Tone[] = ['blush', 'lilac', 'mint', 'peach'];

/**
 * Assigns a stable accent to an arbitrary category string (industry, event
 * type, …). Deterministic so a given value keeps its colour across renders,
 * reloads and pages — a tag that changes colour on refresh is worse than an
 * uncoloured one.
 *
 * Purely presentational: it selects a token, it does not derive data.
 */
export function categoryTone(value: string): Tone {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return ACCENT_TONES[Math.abs(hash) % ACCENT_TONES.length]!;
}
