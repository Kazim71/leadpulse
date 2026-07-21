/**
 * Accent surfaces.
 *
 * Each tone pairs a 100-level surface with 800-level text in light mode, and
 * a 950-level surface with 300-level text in dark. Pastels do not survive
 * dark mode by simply being lightened — a washed 200-tint on near-black
 * loses its hue and reads as grey — so each tone crosses to the opposite
 * end of its own ramp rather than dimming in place.
 *
 * `cinnamon` and `brick` are both declared but deliberately excluded from
 * `ACCENT_TONES` (the auto-rotation below) — same pattern, two different
 * reasons. `brick` must never be auto-assigned to an arbitrary category,
 * since an error color showing up on a random industry tag would be
 * actively misleading. `cinnamon` is the app's one primary-action color
 * (buttons, links, focus rings); folding it into a 3-way rotation would
 * make it mean four different things depending on which tag happened to
 * hash to it — exactly the "one hue, five meanings" problem this
 * multi-tone system was built to avoid in the first place. Both are only
 * ever reached by passing `tone="cinnamon"` / `tone="brick"` explicitly.
 */
const TONES = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  cinnamon: 'bg-cinnamon-100 text-cinnamon-800 dark:bg-cinnamon-950 dark:text-cinnamon-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
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
 * The three states map to three distinct hues, so status is readable from
 * colour alone when scanning the column: emerald = actionable now, amber =
 * waiting, violet = already handled, neutral = nothing to do.
 */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'ready':
      return 'emerald';
    case 'cooldown':
      return 'amber';
    case 'messaged':
      return 'violet';
    default:
      return 'neutral';
  }
}

/** Accent rotation shared by category tags and chart series. */
export const ACCENT_TONES: Tone[] = ['violet', 'emerald', 'amber'];

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
