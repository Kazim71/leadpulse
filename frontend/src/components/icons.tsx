/**
 * Small hand-rolled inline SVGs, matching the pattern already established
 * in ThemeToggle.tsx — no icon library dependency for a handful of glyphs.
 * `pointer-events-none` on every path/circle so the icon is never the hit
 * target inside a button (see the ThemeToggle pointer-events fix).
 */
type IconProps = { className?: string };

const base = 'pointer-events-none h-4 w-4';

export function CompaniesIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="10" width="7" height="11" />
      <rect x="14" y="4" width="7" height="17" />
      <path d="M6 14h1M6 17h1M17 8h1M17 11h1M17 14h1" />
    </svg>
  );
}

export function ProvisionIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function LeadsIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8h5M16 11h5" />
    </svg>
  );
}

export function SummaryIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function MenuIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}
