/**
 * NorthQu logo.
 *
 * Two user-provided brand assets, each in a light + dark variant (see
 * docs/CHANGELOG.md for provenance and processing):
 *
 *   LogoMark   — the standalone "NQ" monogram (an N and Q intertwined),
 *                square. Used where space is tight and the wordmark would
 *                not fit: the favicon (src/app/icon.png), the collapsed
 *                dashboard sidebar.
 *   LogoLockup — the full lockup: the same NQ monogram followed by the
 *                "NorthQu" wordmark, baked into one image. Used in the
 *                marketing header/footer, the dashboard's expanded
 *                sidebar, and the login/signup pages.
 *
 * WHY LIGHT + DARK RASTER VARIANTS (not one `currentColor` asset): the
 * source art is a flat black line drawing, legible on white/ivory but
 * invisible on black/indigo. Both were processed from the originals with
 * a luminance-to-alpha extraction (black line art → genuinely transparent
 * PNG, no baked background), producing a `-light` variant (near-black art,
 * for light surfaces) and a `-dark` variant (white art, for dark
 * surfaces). Because these are raster, not vector, the color can't adapt
 * via CSS `currentColor` — so each component swaps between the two files
 * with plain CSS (`dark:hidden` / `hidden dark:block`), which works
 * identically in Server Components (marketing, login) and Client
 * Components (dashboard chrome) with no `useTheme()` hook or hydration
 * dependency. Surfaces whose background does NOT follow the page's
 * light/dark theme (e.g. the always-dark footer) pass `forceVariant` to
 * pin the correct one.
 */

type Variant = 'light' | 'dark';

function ThemedImage({
  base,
  alt,
  className,
  forceVariant,
}: {
  base: string;
  alt: string;
  className: string;
  forceVariant?: Variant;
}) {
  if (forceVariant) {
    return <img src={`${base}-${forceVariant}.png`} alt={alt} className={className} />;
  }
  return (
    <>
      <img src={`${base}-light.png`} alt={alt} className={`${className} dark:hidden`} />
      <img src={`${base}-dark.png`} alt={alt} className={`${className} hidden dark:block`} />
    </>
  );
}

export function LogoMark({
  className = 'h-8 w-8',
  forceVariant,
}: {
  className?: string;
  forceVariant?: Variant;
}) {
  return (
    <ThemedImage base="/brand/northqu-mark" alt="NorthQu" className={className} forceVariant={forceVariant} />
  );
}

/**
 * Full lockup (monogram + "NorthQu" wordmark) as a single image. The
 * wordmark is part of the raster now, not live text — the previous
 * `wordClassName` text prop is gone, since the provided lockup art bakes
 * in its own typeface. Height is what callers control; width follows the
 * image's own ~3.35:1 aspect ratio via `w-auto`.
 */
export function LogoLockup({
  className = 'h-7',
  forceVariant,
}: {
  className?: string;
  forceVariant?: Variant;
}) {
  return (
    <ThemedImage
      base="/brand/northqu-lockup"
      alt="NorthQu"
      className={`${className} w-auto`}
      forceVariant={forceVariant}
    />
  );
}
