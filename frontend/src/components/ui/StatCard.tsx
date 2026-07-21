import { Card } from './Card';
import type { Tone } from './Badge';

/**
 * Accent applied to the label and the short rule above the value. The value
 * itself stays ink — a large number rendered in a pastel loses contrast, and
 * the number is the thing being read.
 */
const LABEL_TONES: Record<Tone, string> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  cinnamon: 'text-cinnamon-700 dark:text-cinnamon-300',
  violet: 'text-violet-700 dark:text-violet-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  amber: 'text-amber-700 dark:text-amber-300',
  brick: 'text-brick-700 dark:text-brick-300',
};

const RULE_TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-300 dark:bg-neutral-600',
  cinnamon: 'bg-cinnamon-400',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  brick: 'bg-brick-300',
};

export interface StatTrend {
  /** Percentage change vs. the prior period. Null when the prior period was 0 — never fabricated. */
  pctChange: number | null;
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Optional accent. Defaults to neutral, so existing call sites are unchanged. */
  tone?: Tone;
  /** Optional, and only ever built from a real prior-period query — see getEventCountTrend(). */
  trend?: StatTrend;
}) {
  return (
    <Card className="p-5">
      <span className={`mb-2.5 block h-0.5 w-6 rounded-full ${RULE_TONES[tone]}`} />
      <div className="flex items-start justify-between gap-2">
        <p className={`text-2xs font-medium uppercase tracking-wider ${LABEL_TONES[tone]}`}>
          {label}
        </p>
        {trend ? <TrendBadge pctChange={trend.pctChange} /> : null}
      </div>
      {/* tabular-nums keeps digits from jittering as values change */}
      <p className="mt-2 font-display text-3xl tabular-nums text-black dark:text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </Card>
  );
}

function TrendBadge({ pctChange }: { pctChange: number | null }) {
  if (pctChange === null) {
    return <span className="text-2xs text-neutral-400 dark:text-neutral-500">new</span>;
  }

  const flat = Math.abs(pctChange) < 1;
  const up = pctChange >= 0;
  const color = flat
    ? 'text-neutral-400 dark:text-neutral-500'
    : up
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-brick-700 dark:text-brick-300';

  return (
    <span className={`flex items-center gap-0.5 text-2xs font-medium tabular-nums ${color}`}>
      {flat ? '' : up ? '▲' : '▼'} {Math.abs(pctChange).toFixed(0)}%
    </span>
  );
}
