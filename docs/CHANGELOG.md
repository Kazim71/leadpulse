# Changelog

Reverse-chronological. One entry per task/phase.

---

## 2026-07-21 — New user-provided NQ logo assets + footer back to black

Replaced the earlier flattened-Canva-ring logo with two new user-provided
brand assets, and (per the same message) reverted the footer to black.

**Two source assets, by use case (as specified):**
- `Logo Design.{png,svg}` — the standalone "NQ" monogram (N + Q
  intertwined). → favicon/app icon and the collapsed dashboard sidebar.
- `Logo.{png,svg}` — the full lockup: NQ monogram + "NorthQu" wordmark
  baked into one image. → marketing header/footer, expanded dashboard
  sidebar, login/signup.

**Processing.** Both provided SVGs were (again) raster-embedded JPEG, not
clean vector — but the art is flat black line work, so a clean
luminance-to-alpha extraction was possible from the PNGs: white/near-white
→ transparent, black line art preserved with anti-aliased alpha, trimmed
to content with 8% padding. The monogram was additionally padded to a
square (for favicon correctness). Each asset produced two variants — a
`-light` (near-black art, `#111`) for light surfaces and a `-dark` (white
art) for dark surfaces — since the art can't recolor via CSS
`currentColor` once rasterized. Shipped to `public/brand/`:
`northqu-mark-{light,dark}.png` (512×512) and
`northqu-lockup-{light,dark}.png` (900×269). All four render-verified on
white / ivory / black / indigo before wiring in. The old
`northqu-icon-{light,dark}.png` and the four source reference files were
deleted.

**`Logo.tsx` reworked.** `LogoMark` now renders the monogram,
`LogoLockup` the full lockup image (the wordmark is part of the raster
now — the old live-text `wordClassName`/`markClassName` props are gone).
Both auto-swap light/dark via `dark:hidden`/`hidden dark:block`, with a
`forceVariant` escape hatch for surfaces whose background doesn't follow
the page theme. `src/app/icon.png` + `apple-icon.png` set to the
monogram. All call sites updated: marketing header, login, signup,
dashboard sidebar (expanded = lockup, collapsed = monogram), footer.

**Footer reverted to black** (`bg-brand-indigo` → `bg-black`),
unconditional in both light and dark modes, per explicit instruction in
the same message — undoing the brief Indigo-footer experiment from the
prior entry. The footer lockup uses `forceVariant="dark"` (white art),
since the footer is always a dark surface.

**Verified:** `tsc --noEmit` clean, production build 19/19 routes,
`test/verify-theme-consistency.mjs` updated (footer now asserted black in
both modes; logo asserted as the `northqu-lockup-*` asset in
header/login/signup/sidebar) and re-run 30/30 passing. Screenshot-
confirmed directly: header lockup (dark art on white / white art on
black), black footer with legible white lockup in both page themes,
login page lockup, and favicon serving the monogram (200, image/png).

## 2026-07-21 — Footer logo fix: full lockup, not icon-only

`SiteFooter.tsx` was rendering `LogoMark` (icon only) instead of
`LogoLockup` (icon + "NorthQu" wordmark) — an unlabeled ring with no
brand name next to it. Switched to `LogoLockup`, keeping
`forceVariant="dark"` (the light-ring/dark-legible icon variant — Space
Indigo is a dark color, same reasoning as before) and overriding
`wordClassName` to a flat `text-marketing-text` (Ivory, already
contrast-tuned against Space Indigo) instead of the component's default
`text-black dark:text-white` pairing, since the footer's background
never changes with the page's own light/dark toggle, so its text
shouldn't either. Matched the wordmark's type style
(`font-sans text-base font-medium`) to `SiteHeader`'s, not the
dashboard's serif, for consistency within the marketing site itself.

**Verified:** `tsc --noEmit` clean. Direct element screenshots of the
footer in both light and dark page modes confirm the full "Q NorthQu"
lockup renders identically in both (ring+tail icon legible, Ivory
wordmark text legible) against the unconditionally-Indigo background.

## 2026-07-21 — Same-day correction: footer is Indigo, page dark mode is black

Direct follow-up to the cross-cutting consistency pass earlier today, which
had gotten two color relationships backwards per explicit user feedback:

1. **Footer was black, should be Space Indigo** — in BOTH light and dark
   page-themes, unconditionally, not paired with the page's own toggle
   state at all. `SiteFooter.tsx`: `bg-brand-black` → `bg-brand-indigo`.
   Its text/border tokens (`marketing.text`/`textDim`/`textFaint`/
   `border`) needed no change — they were always contrast-tuned against
   Space Indigo specifically (see `tailwind.config.ts`), so they're
   correct again now that the footer's background is indigo once more.

2. **Marketing dark mode used Indigo, should use black like the
   dashboard** — the earlier pass made the marketing site's dark theme
   reuse its original `marketing.bg` (Space Indigo) as the page-level
   dark background. Explicit instruction: dark mode on the public pages
   should match the dashboard's own dark mode exactly (black), not a
   separate indigo-based theme. Fixed by replacing `dark:bg-marketing-bg`
   / `dark:text-marketing-text` / `dark:text-marketing-textDim` /
   `dark:text-marketing-textFaint` / `dark:border-marketing-border` /
   `dark:bg-marketing-surface` with literal `dark:bg-black` /
   `dark:text-white` / `dark:text-neutral-400` / `dark:text-neutral-500`
   / `dark:border-neutral-800` / `dark:bg-neutral-900` — the SAME tokens
   `globals.css` already uses for the dashboard's dark mode — across
   `(marketing)/layout.tsx`, `SiteHeader.tsx`, `ContactForm.tsx`, and all
   5 public pages (`page.tsx`, `about`, `features`, `product`, `contact`).
   `marketing.accent`/`accentHover` (Cinnamon Wood) were left alone —
   the accent color itself never changed, only body/surface/text/border.

**Net effect on `tailwind.config.ts`'s `marketing.*` block:** it's no
longer a page-wide dark-mode variant at all — `bg`/`surface`/
`surfaceHover`/`border`/`text`/`textDim`/`textFaint` are now consumed by
exactly one component, `SiteFooter`, unconditionally. `accent`/
`accentHover` remain general-purpose (e.g. `CursorGlow`'s decorative
ring). Comments updated in place to describe this narrower, corrected
role rather than the superseded "marketing dark theme" framing from
earlier today.

**Verified:** `tsc --noEmit` clean, production build 19/19 routes.
`test/verify-theme-consistency.mjs` updated and re-run, 30/30 checks:
footer confirmed Space Indigo (`rgb(41, 48, 73)`) on all 5 public pages
in light mode AND after toggling to dark; landing-page dark-mode body
confirmed literal black (`rgb(0, 0, 0)`), matching the super-admin
dashboard's own dark-mode body pixel-for-pixel; header background in
dark mode confirmed black-based (`rgba(0, 0, 0, 0.85)`), not indigo.
Also screenshot-confirmed directly: white body / indigo footer in light
mode, black body / indigo footer in dark mode, exactly as specified.

## 2026-07-21 — Cross-cutting theme consistency pass + bugfixes

The prior rebrand applied the new white/black/footer-black/Cinnamon-Wood
system to the marketing site's tokens but never propagated it to
`login/`, `dashboard/`, or `super-admin/` — this pass fixes that, plus
four specific bugs found on the landing page.

**Root cause, stated plainly:** the dashboard route group was still
rendering the ORIGINAL pre-rebrand palette (`ink` warm-cream neutrals,
`blush`/`lilac`/`mint`/`peach` pastels) — those tokens were never touched
by the rebrand task, which only worked on `tailwind.config.ts`'s
`marketing.*`/`brand.*` blocks and the marketing pages that consume them.

### Token migration (login/, dashboard/, super-admin/) — itemized

Every one of these 21 files had `ink-*`/`blush-*`/`lilac-*`/`mint-*`/
`peach-*` class references and was migrated (415 mechanical renames,
verified zero remaining via `grep -rn "ink-[0-9]\|blush-[0-9]\|lilac-[0-9]\|mint-[0-9]\|peach-[0-9]" src/`):
`globals.css` (body background/text, focus ring), `DashboardChrome.tsx`,
`SidebarNav.tsx`, `ThemeToggle.tsx`, `NotificationBell.tsx`,
`SignOutButton.tsx`, `AuthForm.tsx`, `SecretReveal.tsx`,
`ProvisionForms.tsx`, `CompanyGrid.tsx`, `LeadsTable.tsx`,
`SummaryPanel.tsx`, `EventsOverTimeChart.tsx` (plus one hardcoded hex,
`#DA8093`, invisible to a class-name grep — recharts fills are inline SVG
attributes, not Tailwind classes, so this needed a manual catch),
`ui/Card.tsx`, `ui/StatCard.tsx`, `ui/Badge.tsx`, `ui/EmptyState.tsx`,
`ui/Skeleton.tsx`, `Logo.tsx`, `login/page.tsx`, `signup/page.tsx`,
`dashboard/page.tsx`, `dashboard/summary/page.tsx`, `super-admin/page.tsx`,
`super-admin/new-org/page.tsx`, `super-admin/org/[organizationId]/page.tsx`.

**Mapping used** (`ink` → Tailwind's stock `neutral` scale, endpoints
`ink-50`/`ink-900`/`ink-950` → literal `white`/`black` per the rule;
`blush` → new `cinnamon` ramp; `lilac`/`mint`/`peach` → Tailwind stock
`violet`/`emerald`/`amber`). `ink` and the three pastels are removed
entirely from `tailwind.config.ts`, not just repainted — grep-verified,
not assumed.

**One real design decision, not just a rename:** `blush` had TWO roles —
the single primary-accent color (buttons/links/focus rings, now
`cinnamon`'s job) AND one of four rotating hues for category-tag/status-
badge/chart-bar color (`Badge.tsx`'s `ACCENT_TONES`). Folding `cinnamon`
into that rotation too would recreate the exact "one hue, five meanings"
problem the four-pastel system was originally built to solve — a badge
randomly landing on the same color as the primary CTA reads as broken,
not as "brand-consistent." So the categorical rotation is now 3 hues
(`violet`/`emerald`/`amber`, was 4), and `cinnamon` sits alongside `brick`
(errors) as an explicitly-addressable, non-rotating tone — usable via
`tone="cinnamon"` (e.g. the dashboard's "Contacts" stat card, previously
`tone="blush"`) but never auto-assigned by `categoryTone()`'s hash.
`BAR_TONES`/`DOT_TONES` in `SummaryPanel.tsx` updated to match (both used
`% array.length`, so shrinking 4→3 needed no other code change).

### Landing/marketing site — itemized bug fixes

1. **Indigo background showing where it should be white.** The marketing
   site was dark-ONLY by explicit prior decision — `marketing.*` tokens
   were applied unconditionally, with no light variant at all. Per this
   task's explicit override of that decision, light is now the default:
   every `text-marketing-text`/`textDim`/`textFaint`, `border-marketing-
   border`, and `bg-marketing-surface` across all 5 public pages
   (`page.tsx`, `about`, `features`, `product`, `contact`) plus
   `SiteHeader.tsx`, `(marketing)/layout.tsx`, and `ContactForm.tsx` now
   pairs a literal light value (`white`/`black`/`neutral-*`/
   `brand.ivory`) with the existing `marketing.*` value under `dark:`.
   The footer is the one deliberate exception — `bg-brand-black`
   unconditionally, in BOTH themes, per the "footer stays black in both
   modes" rule (it already was; no bug there).

2. **No dark-mode toggle on the marketing site.** Added — `SiteHeader`
   now renders the exact same `ThemeToggle` component the dashboard uses
   (next-themes, localStorage-persisted), not a second implementation.
   Verified: toggling on `/` flips `<html>`'s `dark` class, persists
   across a reload, and the marketing site's earlier "dark-only" design
   intent survives as what dark MODE looks like now, rather than the only
   mode.

3. **Header breaks on scroll.** Root cause: the header had `bg-marketing-
   bg/85 backdrop-blur` styling clearly meant to sit over scrolling
   content, but no `position` class at all — it had no `sticky` or
   `fixed`, so it simply scrolled away with the page and that styling
   never did anything. Fixed with `sticky top-0 z-40` (z-40 sits below
   `CursorGlow`'s decorative `z-[100]` overlay, above ordinary content).
   Verified by an actual 1200px scroll in headless Chrome, not by
   inspecting the CSS: header stays pinned at `top: 0`, keeps a
   non-transparent computed background, and its nav links are still
   real-clickable after scrolling.

4. **Wrong/stale logo.** Investigated and found NOT a bug — `grep` for
   `LogoMark`/`LogoLockup` usage across the whole `src/` tree turned up
   only `Logo.tsx` and its 5 known call sites, all already pointing at
   the final decided asset from the prior session
   (`public/brand/northqu-icon-{light,dark}.png`, the flattened raster
   from the user-provided Canva artwork — see that entry above for the
   full logo history). Render-confirmed on `/`, `/login`, `/signup`, and
   the authenticated super-admin sidebar: every header resolves to
   `/brand/northqu-icon-*.png` with a non-zero natural width.

5. **Login/Dashboard on the old palette.** Covered above — this was the
   root-cause finding, not a separate bug.

**Verified:** `tsc --noEmit` clean. Production build, 19/19 routes. A new
`test/verify-theme-consistency.mjs`, 29/29 checks in real headless
Chrome: white/black-footer confirmed on all 5 marketing pages in light
mode; dark-mode Space-Indigo body + black footer confirmed after toggling;
toggle persists across reload; sticky header confirmed through a real
scroll; correct logo confirmed on 5 different pages including the
authenticated dashboard; login page's heading confirmed literally black
and its "Create one" link confirmed Cinnamon Wood (not the old blush);
super-admin body confirmed white in light / black in dark; and a final
`grep` across all of `src/` confirming zero remaining deprecated token
references anywhere in the codebase, not just the files touched.

**Not touched, deliberately:** `brick` (destructive/error color) was not
part of this task's flagged deprecated-token list and still serves a
distinct, legitimate role (never mistakable for a category tag) — left
as-is.

## 2026-07-21 — Rebrand: Northcue → NorthQu, new brand palette, raster logo

**Name.** Every user-facing "Northcue" string replaced with "NorthQu"
(exact casing) across `frontend/`: page titles, `Logo.tsx`, marketing
pages, footer copyright, `package.json`'s `name` field (and
`package-lock.json`, regenerated via `npm install --package-lock-only`
rather than hand-edited). Zero remaining occurrences confirmed via grep,
except the prior task's own verify script
(`test/verify-rebrand.mjs`, which tested the *previous* LeadCapsule→
Northcue migration) — left untouched, same "don't edit an already-applied
migration's historical record" discipline this project has followed
since the schema migrations.

**Palette — chose Palette A (Cinnamon Wood), not B (Wine Plum).**
Reasoning: Cinnamon Wood (`#C67155`) is close enough to the marketing
site's pre-existing accent from the prior dark-editorial redesign
(`#C97B52`, "a muted, desaturated rust") that adopting it barely disturbs
the site's existing warm-toned visual language — it reads as formalizing
what was already there, not replacing it. Wine Plum would have meant
re-deciding that whole system from scratch for no stated benefit. New
`brand.*` tokens added to `tailwind.config.ts` (`indigo`, `white`,
`cinnamon`/`cinnamonHover`, `black`, `ivory`), intended for the still-
queued dashboard re-theme to consume as its light base. The marketing
site's existing `marketing.*` tokens were REBASED (not replaced) onto
these — same dark-only design decision as before, now expressed as the
dark end of the same brand system instead of an unrelated palette.
Footer background changed to explicit `bg-brand-black`, per the new
palette's "black is the footer background, site-wide" rule (previously
the footer inherited the page's near-black `marketing-bg`).

One real contrast bug was caught by a written verification script, not
eyeballed: the first `marketing.textFaint` value (55%→ correction below)
measured 2.83:1 against the new indigo background — failing even WCAG
AA-large (3:1). Corrected to blend 55% ivory (up from 35%), landing at
4.78:1, while staying less saturated toward ivory than `textDim` (60%
blend) so the text→textDim→textFaint prominence hierarchy still holds.

**Logo — two attempts, second one shipped, with an explicit user
decision reversing the first recommendation in between.**

*Attempt 1 (recommended, then reversed):* built a new hand-authored,
2-shape SVG (`stroke`d ring + one Cinnamon Wood tail path) using
`currentColor` for the ring so it adapted to any surface automatically.
This met every stated requirement (clean geometry, no autotrace, no
background, dark-mode-safe by construction) and was the initial
deliverable.

*What changed:* the user then supplied `frontend/NorthQu.svg`, described
as "a clean vector export from Canva... not an autotrace." Before
integrating it, it was rendered directly (not just grepped) — this
caught two problems the description didn't anticipate: (1) despite no
`<rect>` tag, the file contained a full-canvas **opaque white raster
layer** (a separate embedded `<image>`, unmasked, sized to cover the
entire viewBox) sitting behind the actual mark — confirmed by rendering
on a red test background, where a solid white box appeared behind the
logo; (2) the "Q" mark itself is a **flattened raster** (3 embedded PNGs
composited via SVG masks/filters for the bevel/gradient look), not
vector paths — only the "NorthQu" wordmark portion was genuine vector
outlines. This was reported as a blocker (per the task's own "if
uncertain, stop and ask" instruction) with the analysis and three
options; **the user explicitly chose to proceed with the provided art
anyway**, accepting the raster/non-adaptive-color tradeoffs already
flagged.

*What was actually shipped:* the background raster layer was surgically
excluded (the isolated icon uses only the mask-and-clip-restricted ring
art, not the full-canvas white layer), re-rendered via a headless-Chrome
screenshot with `omitBackground: true` for a real alpha channel — verified
transparent by rendering on white/ivory/black/Space-Indigo, not by
inspecting markup. The wordmark is NOT rasterized: `LogoLockup` keeps
rendering "NorthQu" as real text in this app's own font (as it always
did), only the ring/tail icon is the new raster asset.

Because the source ring reads near-black, a render-tested check found it
nearly invisible on the dark marketing background and black footer
(exactly the failure this project has repeatedly guarded against). A
second, dark-mode variant was generated algorithmically — inverting
lightness for low-saturation (grayscale/metallic) pixels only, leaving
the saturated Cinnamon Wood tail untouched — rather than hand-picking
replacement colors. `LogoMark`/`LogoLockup` swap between
`public/brand/northqu-icon-light.png` and `-dark.png` via plain CSS
(`dark:hidden` / `hidden dark:block`), not a `useTheme()` hook, so it
works identically in Server Components (marketing pages, `/login`,
`/signup`) and the Client Component dashboard chrome. The marketing site
(dark-only, never applies the `dark` class to itself) passes
`forceVariant="dark"` explicitly at its two call sites instead of relying
on that class.

Old `Logo.tsx`'s hand-built vector implementation was replaced in place
(not kept alongside as unused dead code — this project's standing rule
against half-finished/duplicate implementations applied here too).
`src/app/icon.svg` was replaced by `src/app/icon.png` /
`src/app/apple-icon.png` (Next.js App Router file conventions), using the
light variant (favicons render on light browser-tab chrome).
`frontend/NorthQu.png` / `NorthQu.svg` (the original reference files) were
deleted once their content was fully absorbed into the shipped PNGs.

Final asset sizes (reported plainly — this is accepted as a raster
logo, not vector; no crispness claim at arbitrary sizes):
`northqu-icon-light.png` 72.2 KB, `northqu-icon-dark.png` 97.5 KB (both
384×384, retina-safe for the largest actual usage at ~36px).

**Verified:** production build, 19/19 routes. A new
`test/verify-northqu-rebrand.mjs` (34 checks, all passing): zero
"Northcue" strings on any public page or title; the favicon resolves via
the page's own `<link rel="icon">` (not a guessed URL) and is a real PNG;
every marketing page's logo `<img>` actually renders with a non-zero
natural width; the marketing header's `<img src>` is confirmed to be the
dark variant; footer background confirmed `rgb(0,0,0)`; `/login`
confirmed to have BOTH light and dark `<img>`s in the DOM with only one
visible (proving the CSS-only swap mechanism, not just one hardcoded
asset); a real pixel-level scan of the rendered marketing-header logo
confirmed a bright pixel exists (`maxLuminance: 242`) rather than
assuming the dark variant "looks fine"; all 8 foreground/background
combinations actually used (present and future) checked against computed
WCAG contrast ratios, not eyeballed hex values.

---

## 2026-07-20 — Marketing site: dark editorial redesign

Full visual redesign of all 5 public pages (`/`, `/about`, `/features`,
`/product`, `/contact`), structurally inspired by agency/studio sites
(Orbix Studio referenced for structure only — colors, copy, and assets
are original). Existing page copy is unchanged; verified with a
purpose-built prose-diff script (strips JSX/className, compares only
prose-like string fragments between the pre-redesign and post-redesign
versions of every file) rather than eyeballing a diff — the only new
string anywhere is `"Log in"` reused as a new footer nav link to the
already-existing `/login` route, not new writing.

**Colors** — a new, separately-namespaced `marketing.*` token family in
`tailwind.config.ts` (not a reuse or edit of `ink`/`blush`/etc., so it
can't collide with the dashboard's own upcoming token replacement):
- `marketing-bg` `#100D0C` — page background. Not pure `#000` (reads as a
  dead pixel, not a designed choice) and not neutral charcoal (reads
  cold/techy); carries a faint red-brown undertone, consistent with this
  project's standing rule that no gray/black is ever blue-tinted.
- `marketing-surface` `#1B1716` / `marketing-surfaceHover` `#241E1C` —
  elevated panels (footer, step markers, cards).
- `marketing-border` `#2C2624` — hairline dividers.
- `marketing-text` `#F5F1EC` — primary copy, warm off-white rather than
  stark `#FFF`, same "nothing here is cold" rule applied to the light end.
- `marketing-textDim` `#A8A29B` / `marketing-textFaint` `#6E6862` —
  secondary/tertiary copy tiers.
- `marketing-accent` `#C97B52` / `marketing-accentHover` `#DB916A` — a
  muted, desaturated rust used sparingly (hover states, focus rings, CTA
  hover), deliberately quieter than a SaaS-button orange and deliberately
  distinct from whatever accent the dashboard redesign lands on, so the
  two surfaces never read as one system wearing two coats of paint.

**Typography** — `DM Serif Display` for headlines, loaded in a scoped
nested layout (`(marketing)/layout.tsx`) so its CSS variable never reaches
the dashboard's own Fraunces headings. The first choice, Bodoni Moda, was
abandoned after the build surfaced `Failed to find font override values`
— traced to an exact cause (not just "the build complained"): Next's
bundled font-metrics table keys Bodoni Moda's entry as `bodoniModa11pt`
(the variable font's true family name embeds its optical-size range),
which Next's own normalization of `"Bodoni Moda"` never matches. Without
those override metrics, the fallback-to-webfont swap has no guarantee
against real layout shift — directly conflicting with the "no FOUT/layout
shift" requirement, so it was replaced rather than shipped with an
unverified risk. `DM Serif Display` passed the same metrics check
(confirmed by reading `capsize-font-metrics.json` directly, not assumed)
and is a more deliberate pairing besides: it's the display companion
Google's own "DM" family ships specifically to pair with DM Sans, the
body font already used site-wide.

**Structure** — "How it works" rebuilt as a vertical timeline (was a
3-column grid); Features rebuilt as a numbered editorial list; footer
expanded to 3 real columns (Product / Company / brand mark) linking only
to routes that actually exist — no fabricated "Blog"/"Careers"/social
links standing in for content that isn't real, and no client-logo row for
the same reason (no real client logos exist to show).

**Dark-only by explicit decision, not a broken toggle**: the new palette
has no light counterpart, so `ThemeToggle` was removed from `SiteHeader`
entirely rather than left mounted and inert — a toggle with nothing to
toggle would be the "let it silently break" outcome the brief warned
against. The dashboard's own toggle is untouched and still works; it just
has no effect inside `(marketing)/` because nothing there reads the
`dark` class.

**Cursor glow** — implemented, not skipped: a small ring trailing the
pointer, pure CSS `transform`/`opacity` updates via `requestAnimationFrame`,
gated on `matchMedia('(pointer: fine)')` (never mounted on touch devices)
and `prefers-reduced-motion` (never animated for users who've asked for
less motion), `pointer-events-none` throughout so it can never intercept a
click.

**Verified, not assumed:** production build (18/18 routes, zero font
warnings after the DM Serif Display switch). 26/26 checks in a real
headless-Chrome run: dark background covers full page height on all 5
routes (not just body's computed style, which is a red herring — see the
verify script's own comment on why `document.body`'s first child is a
Next-injected `<script>` tag, not the app's content), the display serif is
actually applied to every `h1`, high-contrast text color confirmed,
**real Cumulative Layout Shift measured via the Layout Instability API**
(max observed: 0.008, most pages exactly 0 — well under the 0.1 "needs
improvement" threshold), the theme toggle's absence confirmed, footer
column count confirmed, and — specifically for the cursor effect — a real
click on a nav link and on the hero CTA both still navigate correctly
with the effect mounted, and the effect's opacity is confirmed 0 on a
touch-emulated viewport. Also re-confirmed `/login` and `/dashboard`
render identically to before (unchanged cream background, blush tokens
intact) after the `tailwind.config.ts` edit, proving the new `marketing.*`
namespace didn't disturb the existing token system.

Two bugs in my own verification script were caught and fixed during this
work, not glossed over: a background check against `document.body`
directly (masked by Next's script-tag DOM ordering) and a font-family
regex expecting literal spaces where `next/font` generates underscored
scoped names (`__DM_Serif_Display_<hash>`).

**Not done in this pass:** the dashboard's own light/orange-red redesign
and the final cross-cutting consistency/verification pass remain queued
— see `docs/TODO.md`.

---

## 2026-07-20 — Rebrand: LeadCapsule → Northcue

Display-name and visual-identity change only. Repo/folder paths, the
`organizations` table, and every other schema/database identifier are
unchanged — confirmed via `git diff --stat` against `backend/`, `supabase/`,
and every auth/RLS file (zero changes).

- Replaced "LeadCapsule" in every user-facing string: page titles, the
  marketing header/footer, login/signup, `<meta>` title. `README.md`'s
  product name updated too, preserving (not erasing) the rename history —
  it now notes leadpulse → LeadCapsule → Northcue as two separate renames.
- New logomark (`frontend/src/components/Logo.tsx`): an abstract geometric
  mark — two stacked chevrons forming an upward "north" point — not a
  literal letterform. Built with `fill="currentColor"` throughout, so one
  SVG works as pure black on white or pure white on black just by setting
  text color on the wrapper; no separate light/dark asset. Used at both
  favicon size (`src/app/icon.svg`, Next.js's App Router favicon
  convention) and header/sidebar size via the same `LogoMark`/`LogoLockup`
  components.
- **Deliberately left untouched**, and why:
  - `super@leadcapsule.dev` / `nobody@leadcapsule.dev` in test scripts and
    `supabase/seed.sql` — these are **real, already-created Supabase auth
    account emails**, not brand copy. Changing the string would point the
    verification scripts at logins that don't exist.
  - SQL comments in `0003_super_admin.sql` / `0004_contact_inquiries.sql`
    mentioning "LeadCapsule" — both migrations are already applied;
    editing an already-applied migration's comments after the fact breaks
    the "migrations are an immutable historical record" discipline this
    project has followed throughout. They correctly describe what the
    product was called at the time each migration was written.

**Verified:** production build (18/18 routes, `/icon.svg` now its own
static route). 33/33 checks in a real headless-Chrome run covering all 7
public pages plus `/super-admin` and `/dashboard`, in both themes, checking
the logo actually renders (not just that the component compiles),
including the collapsed-sidebar mark-only state. Two test-script bugs were
caught and fixed during this run, not silently worked around: a
case-insensitive brand-string scan was flagging the literal substring
"leadcapsule" inside the logged-in test user's own email address (real
account data rendering correctly, not stale copy) — the scan now strips
email-shaped substrings first; and a `DOMRect` returned directly from
`page.evaluate()` serializes to `{}` over Puppeteer's CDP bridge (a known
quirk — DOMRect's properties are prototype getters, not own enumerable
properties) — fixed by destructuring into a plain object before returning.

**Not attempted this session:** the marketing-site dark/editorial
redesign, the dashboard light/orange-red redesign, and the dashboard
UI/UX feature pass (calendar picker, radial stat, sparklines, sortable
leads table) were all requested in the same batch as this rebrand. Given
the standing instruction to verify everything before reporting done,
attempting all four in one pass would not have left room to genuinely
verify each — see the conversation for the explicit scope decision to do
the rebrand first, fully verified, rather than a rushed pass across all
four.

---

## 2026-07-20 — Shopify theme wiring: product/search/category snippets

Authored (not executed — no Shopify admin access exists in this
environment) three Liquid+JS snippets for the "Aarav Electronics" duplicate
theme, wiring real template data into `window.leadpulse.track()` calls:
`productDetail` (product page), `search` (search results), `category_view`
(collection page). Builds on the already-live `page_view` auto-tracking.
Does not modify `tracking-snippet/src/tracker.ts` or the built dist file —
Liquid-side only. Full reference copy saved to
`tracking-snippet/shopify-integration.md`.

Key correctness detail surfaced before writing anything: `defer`/`async`
have no effect on inline `<script>` tags (only on scripts with a `src`), so
an inline snippet placed in a template can execute before a deferred
tracker bundle finishes loading. Since `theme.liquid` can't be inspected
directly to confirm the stub-queue pattern from `TESTING.md` is present,
every snippet waits for `DOMContentLoaded` and logs a `console.warn` if
`window.leadpulse` still isn't ready, rather than silently dropping the
event on a load-order race.

Event payload shapes were checked against
`backend/src/modules/events/events.schema.ts` before writing any Liquid —
in particular, the search term was placed in `actionField.option` to match
the exact shape already used by `supabase/seed.sql`'s seeded search event,
rather than inventing a new field.

**Not verified end-to-end** — unlike every other entry in this changelog,
there is no live-database confirmation here yet, because these snippets
haven't been pasted into the real theme. See `docs/TODO.md`.

---

## 2026-07-19 — Contact form verified end-to-end

Migration `0004_contact_inquiries.sql` was applied (by the user, in the
Supabase SQL editor — DDL can't run through PostgREST). Ran the prepared
`frontend/test/verify-contact-form.mjs` against the live database: a real
browser submission through `/contact` shows the success state and lands a
row with the correct `name`/`email`/`message`; a direct anon-key client can
INSERT (confirming the RLS policy actually grants it, not just that the
form's own request happened to work); the same anon-key client's SELECT
attempt on that row returns an empty result rather than an error or the row
itself (confirming RLS blocks the read rather than merely that nobody built
a read path); and a platform-admin login can read the row
(`is_platform_admin()` policy working in the other direction). All 6
checks passed; test rows removed after, table confirmed empty. The
"blocked" note from the prior entry is resolved — see `docs/TODO.md`,
which now reflects only the SMTP-notification gap, not a verification gap.

---

## 2026-07-19 — Public marketing site

Built the full public site: landing page at `/` (auth-aware) plus four
always-public pages (`/about`, `/features`, `/product`, `/contact`),
sharing one header/nav/footer via a new Next.js route group,
`frontend/src/app/(marketing)/`. `/blog` and `/pricing` explicitly out of
scope, per the brief.

- **Auth-aware `/`**: reuses `getViewer()` — the same role-resolution
  function every other protected route already uses — rather than
  reimplementing it. Anonymous visitors see the landing page; `org_admin`
  → `/dashboard`, `platform_admin` → `/super-admin`, `unassigned` →
  `/pending`, exactly matching the existing role model. The old root
  `src/app/page.tsx` (pure redirect, no content) was replaced by
  `(marketing)/page.tsx`, since a route group's `page.tsx` maps to the same
  URL and both can't coexist.
- **Middleware updated**: `frontend/src/lib/supabase/middleware.ts`'s
  public-path allowlist gained `/`, `/about`, `/contact`, `/features`,
  `/product` — without this, an anonymous visit to any of the four pages
  would have been bounced to `/login` before ever reaching the page
  component. `/dashboard` and `/super-admin` protections are untouched.
- **Contact form**: real insert into a new `contact_inquiries` table
  (`supabase/migrations/0004_contact_inquiries.sql`) via the anon-key
  browser client — no backend API involved, consistent with "frontend
  reads/writes via anon key + RLS." This is the first table in the project
  where `anon` gets real write access; every prior table's policy was "anon
  gets nothing" (see 0001's Grants section) because writes went through the
  trusted backend's service_role instead. Scoped narrowly: anon may INSERT
  only, `is_platform_admin()` (reused from 0003, not reinvented) gates
  SELECT.
- **`/features` copy verified against the codebase before writing it** —
  the 11 event types are copy-pasted from `EVENT_TYPES` in
  `events.schema.ts`, not summarized from memory; CSV export is deliberately
  **not** listed (confirmed absent via grep); "always-current," not
  "real-time," describes the dashboard, since it's `force-dynamic`
  Server Components on each request, not a websocket/polling live feed —
  claiming "real-time" would have overstated what's built.
- No invented usage statistics on the landing page (brief explicitly ruled
  this out) — the capabilities section frames real, built capabilities
  instead of fabricated numbers like lead counts.

**Verified:** production build (17/17 routes). 14/14 checks in a real
headless-Chrome run: anonymous `/` renders the full landing page; logging
in as an actual org-admin and as an actual platform-admin each redirect `/`
to the correct destination; all four public pages render with the shared
header/footer and are reachable via real nav-link clicks; both themes
render correctly on all five pages.

Migration `0004_contact_inquiries.sql` was pending at the time of this
entry; end-to-end verification of the contact form and its RLS policies is
recorded in the entry above this one, dated the same day.

---

## 2026-07-19 — Nav-highlight fix + dashboard feature expansion

**Bug fix (Part 1):** `activeHref` on the sidebar nav was a hardcoded string
passed once per layout — `super-admin/layout.tsx` always passed
`"/super-admin"`, so navigating to `/super-admin/new-org` ("Provision")
still highlighted "Companies." Replaced with `resolveActiveHref()` in the
new `frontend/src/components/SidebarNav.tsx`, deriving the active item from
`usePathname()` with longest-prefix matching (needed so
`/super-admin/org/[id]` still resolves to "Companies" rather than
colliding with "Provision"). **Verified** via computed `aria-current` and
background color on both routes in a real browser, not by reading the code.

**Feature expansion (Part 2), scoped to visual/UX depth only — no schema,
RLS, auth, or existing query restructuring:**

- **Sidebar collapse**: icon-only collapsed state, persisted to
  `localStorage` (`lc_sidebar_collapsed`), with hover tooltips on collapsed
  icons. Extracted the interactive chrome into a new client component,
  `DashboardChrome.tsx`, composed by the still-server `AppShell.tsx` —
  `children` (the page's own Server Component tree) passes through the
  client boundary without being forced to render client-side.
- **Mobile hamburger overlay**: the sidebar was already `hidden ... lg:block`
  (unchanged breakpoint); added the missing hamburger button + overlay
  drawer for everything below `lg`.
- **Notification bell**: real derived signal, not a fake badge — contacts
  with `message_status='ready'` and `last_seen` within 24h
  (`getReadySignal()` / `getPlatformReadySignal()` in `queries.ts`). Honest
  limitation documented inline: `contacts` has no status-change timestamp,
  so this is "recently active leads currently marked ready," not literally
  "became ready in the last 24h" — the UI copy says so rather than
  overclaiming precision the schema can't support.
- **Charts**: added `recharts` (justification in a code comment on
  `EventsOverTimeChart.tsx` — SVG-based, composes as JSX, no second
  rendering pipeline). One real chart on both the org-admin's
  `/dashboard/summary` and the super-admin's per-org drill-down
  (`getEventsOverTime()`, scoped by `organization_id`), plus a genuine
  cross-org aggregate on the super-admin index page
  (`getPlatformEventsOverTime()` — documented as the one deliberate
  exception to "every query filters `organization_id`," since that's the
  entire point of the platform-wide view). The existing "Events by type"
  styled-div bars were deliberately left as-is rather than converted to a
  second chart component — already themed correctly and not worth the
  churn for this task.
- **Stat card trends**: `StatCard` gained an optional `trend` prop showing a
  real week-over-week percentage from `getEventCountTrend()`. Returns
  `pctChange: null` (rendered as "new") when the prior week has zero events,
  rather than an infinite or fabricated percentage.
- **Loading states**: added `loading.tsx` (Next.js route-segment Suspense
  boundaries) for `/dashboard`, `/dashboard/summary`, `/super-admin`, and
  `/super-admin/org/[id]`, using new `Skeleton`/`TableSkeleton`/
  `CardSkeleton`/`CardGridSkeleton` primitives — previously these routes had
  no loading UI at all.
- **Empty states**: audited rather than assumed — `LeadsTable` and
  `CompanyGrid` already had them; `SummaryPanel`'s sub-widgets already
  handled zero-data per-section. Added one new empty state, inside
  `EventsOverTimeChart` itself, for a window with zero events.

**Corrected against the brief:** no date-range filter exists anywhere in
this UI (confirmed by grep before writing any chart code) — the brief's
"existing date-range filter" didn't exist to plumb into, so the new time-
series queries take a `days` parameter defaulting to 14 instead. Flagged
in `docs/TODO.md` rather than silently building a filter control that
wasn't asked for or scoped.

**Verified:** full production build (13/13 routes); 18/18 checks in a real
headless-Chrome run covering both nav-highlight routes, sidebar
collapse+persistence+reload, mobile drawer open/close, the notification
bell's real dropdown content (confirmed showing the actual seeded
`Priya Nair` / Acme Test Store row), chart SVG presence in both light and
dark mode, the trend badge's honest "new" state, and — re-checked, not
assumed — that the theme toggle, RLS-backed `/super-admin` gating for an
org admin, and the provisioning route's 403 all still work after the
refactor.

---

Entries below this point are
a reconstruction from git history and code comments (only one commit exists
so far — `11de6b7`, covering Phases 1-3 — everything since is uncommitted
local work). Going forward, a new entry is appended at the end of every task
per the standing instruction in `README.md`.

---

## 2026-07-19 — Documentation pass

Created `README.md`, `docs/CHANGELOG.md`, `docs/TODO.md`. No application code, schema, or config touched. Established the standing instruction (in `README.md`) to update these two docs at the end of every future task automatically.

---

## 2026-07-19 — Dashboard re-theme (pastel accents)

Token-only swap of `frontend/tailwind.config.ts`, replacing the single-accent clay/moss/ochre palette with a warm neutral base (`ink`, unchanged) plus a four-color pastel accent family (`blush`, `lilac`, `mint`, `peach`) for status badges, category tags, and chart series. `brick` (errors) kept separate from the accent family on purpose.

Added `categoryTone()` — a deterministic string-hash color assignment so a given industry/category keeps the same accent across renders and reloads.

**Verified:** production build passes; confirmed via headless Chrome that light/dark both render with correct computed colors (e.g. dark-mode stat label crosses from `#8F3B50` to `#E9A9B5` rather than washing out); confirmed `src/lib/` and `src/app/api/` have zero diff, i.e. no data or auth logic was touched.

---

## 2026-07-19 — Super-admin provisioning flow

Added `frontend/src/app/api/admin/organizations/route.ts` and `.../invite/route.ts` — Route Handlers using a service-role Supabase client (`frontend/src/lib/supabase/admin.ts`, guarded with `server-only`) to create organizations and invite org admins. Both routes independently re-check `getPlatformAdminOrNull()` server-side — the UI hiding the form proves nothing on its own.

Two Supabase Admin API behaviors were probed empirically before building around them (per the "don't assume" instruction):
- `auth.admin.inviteUserByEmail()` returns `400 "Email address is invalid"` in this project because no custom SMTP is configured. **Not usable yet** — see `docs/TODO.md`.
- `auth.admin.createUser()` + a generated temp password works, and duplicate emails return a handleable `422 email_exists`.

`api_key` generation is not reimplemented in Node — the org insert omits the column and lets the Postgres column default from `0001_init_schema.sql` (`encode(gen_random_bytes(24),'hex')`) generate it, so the format lives in exactly one place.

**Verified:** full headless-Chrome run creating a real organization, confirming the generated `api_key` is a real 48-hex-char value in the DB, confirming that key is *accepted by the live Render backend* (a 202 on `/api/events`, not just present in the DB), inviting a real admin, and logging in as that new admin to confirm they land on `/dashboard` scoped to only their new org with zero seed-tenant data visible. Also verified an org-admin gets 403 from both routes via direct POST, not just a hidden link.

---

## 2026-07-19 — Phase 7: two-tier auth dashboard + schema patch

**Schema** (`supabase/migrations/0003_super_admin.sql`): added `organizations.industry` (free text), a new `platform_admins` table (deliberately separate from `admin_users` — a platform admin has no home org and forcing one into that model would mean a nullable `organization_id` weakening every existing policy), and `is_platform_admin()` (SECURITY DEFINER, mirrors `current_org_id()`'s pattern).

Extended the *SELECT* policies only on `organizations`/`admin_users`/`contacts`/`events`/`visitor_identity_map` with `OR is_platform_admin()`. Deliberately **not** added to INSERT/UPDATE/DELETE — the brief's own phrasing ("read access") was followed over the literal "every USING clause" instruction, because DELETE policies have only a USING clause and no WITH CHECK, so adding it there would have granted platform admins delete rights on every tenant's data. This was flagged explicitly rather than silently resolved.

**Dashboard** (`frontend/`): Next.js 14 App Router, Supabase Auth, Tailwind. `/dashboard` (org-admin, org id resolved server-side from their `admin_users` row, never from a URL param) and `/super-admin` (platform admin, company grid + per-org drill-down at `/super-admin/org/[organizationId]`, gated by a server-side `requirePlatformAdmin()` at the layout level so the whole subtree is protected). Custom design tokens (original clay/ink/moss palette at this point, replaced in the later re-theme task above), Fraunces display serif + DM Sans, dark mode via `next-themes` with light as default.

Presentational components (`LeadsTable`, `SummaryPanel`, `CompanyGrid`) receive data as props; all Supabase queries live in `frontend/src/lib/queries.ts` and are called from page-level Server Components, never inline in JSX.

**Verified:** 14/14 checks against the live database using real logins through the anon key — platform admin reads both orgs' contacts, cannot insert or delete into another org (proving the SELECT-only policy decision holds), org admin still sees only their own org (Phase 1's isolation guarantee unchanged), an unassigned user (no `admin_users` row) sees zero rows everywhere rather than an error.

---

## 2026-07-19 — Phase 3: browser tracking snippet

`tracking-snippet/`: standalone TypeScript module (`tracker.ts`, `visitorId.ts`, `debounce.ts`, `api.ts`) built with esbuild into a single IIFE bundle with zero runtime dependencies, under the 5kb budget (**4.41kb** actual — build script fails the build if this regresses).

- Visitor ID persisted in both localStorage and a cookie (documented rationale: Safari ITP prunes JS-set cookies aggressively, localStorage survives longer but isn't server-readable — belt and suspenders, not redundancy).
- Public API mirrors the SaleAssist convention: `window.leadpulse.track(eventName, data)` / `.identify(data)`, with a pre-init queue so calls made before the script finishes loading aren't lost.
- Event type enum kept in exact sync with the backend's `events.schema.ts` (`page_view`, `search`, `category_view`, `product_view`, `productClick`, `productDetail`, `addToCart`, `promotionClick`, `checkout`, `purchase`, `refund`).
- Client-side debounce: same `event_type:url` firing twice within 2 seconds is dropped silently, capped at 50 tracked keys with LRU eviction — explicitly a different failure mode than the backend's per-visitor rate limiter (this guards against a *correct* page firing duplicates; the backend guards against a *broken* client flooding the endpoint).
- Deliberately does **not** auto-detect product/category/search pages from URL patterns — reasoning documented inline: Shopify-specific, breaks on theme changes, and produces silently wrong analytics rather than missing analytics.

**Verified** with a real, installed Chrome driven via `puppeteer-core` against the live Phase 2 backend: `page_view` auto-fires with a real 202, all 4 manual test buttons produce correct rows in Supabase, `identify()` backfills exactly the expected event count, reload preserves the same `visitor_id`, and rapid-clicking 5 times produces exactly 1 row server-side (counted in Supabase before/after, not inferred from code).

---

## 2026-07-19 — Phase 2: Express ingestion API

`backend/`: TypeScript Express app, clean-architecture layering (`controller` → `service` → `repository`), deployed on Render.

- `config/env.ts` validates all required env vars at boot via zod and exits(1) with a clear message if anything is missing — fails fast rather than at first request.
- `config/supabaseClient.ts`: single service-role client singleton. Required a `ws` package workaround — `createClient()` eagerly constructs a `RealtimeClient` needing a native `WebSocket`, which Node 20 doesn't have (Node 22+ does); this project's actual deploy target is Node 20, so this fix is load-bearing, not cosmetic.
- `middleware/resolveOrg.ts`: `x-api-key` → `organization_id`, cached in-memory with a 60s TTL, including negative caching for unknown keys (uncached negative lookups would let a broken/malicious client bypass the cache entirely).
- `middleware/rateLimiter.ts`: in-memory sliding window per `organization_id` + `visitor_id`, documented as needing a swap to Redis if horizontally scaled.
- `POST /api/events` (202) and `POST /api/identify` (200, `{ contact_id, linked_events }`) — the latter calls a Postgres function (`identify_visitor()`, added in `0002_identify_fn.sql`) rather than sequencing three separate writes from Node, because `supabase-js` gives every call its own implicit transaction over PostgREST and there is no `BEGIN`/`COMMIT` reachable from the client — atomicity had to move into the database.
- Explicit TODOs left in place rather than solved: no idempotency key (a duplicate event on retry is accepted duplication for the MVP), no retry/offline queue on the snippet side.

**Verified** against the live Render deployment (`https://leadpulse-api-m52p.onrender.com`), not just locally: health check, valid-key ingest with the row confirmed in Supabase, invalid-key 401, invalid-payload 400, and the full identify→backfill round trip with the resulting `contact_id`/`linked_events` confirmed against the database directly rather than trusting the API's own response.

---

## 2026-07-18/19 — Phase 1: schema + migrations

`supabase/migrations/0001_init_schema.sql`: `organizations`, `admin_users`, `contacts`, `events`, `visitor_identity_map`. RLS enabled on all tenant-scoped tables, with a single `current_org_id()` SECURITY DEFINER helper referenced by every policy rather than repeating the `admin_users` subquery inline. Partial unique indexes on `contacts (organization_id, phone)` / `(organization_id, email)` where each is not null — enforces the "unique by phone OR email" requirement, which listing plain indexes alone would not have.

`events.metadata` is jsonb with no CHECK constraint on `event_type` at the database level — validation for that lives in the backend's zod schema instead, so a new event type from the snippet gets a clean 400 rather than a raw constraint violation.

`seed.sql`: two test orgs (Acme, Rival — two tenants, not one, because RLS isolation isn't testable with a single tenant), contacts, and events spanning multiple event types, including one deliberately anonymous event used later to test the identify backfill.

**Verified** via `verify.sql`, sections run manually in the Supabase SQL editor: row counts per table, RLS blocking cross-org reads when impersonating the Acme admin (`set local request.jwt.claims`), a cross-org write attempt correctly raising `42501`, and a from-scratch user with no `admin_users` row seeing zero rows across every table (default-deny).
