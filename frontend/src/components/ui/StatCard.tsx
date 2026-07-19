import { Card } from './Card';
import type { Tone } from './Badge';

/**
 * Accent applied to the label and the short rule above the value. The value
 * itself stays ink — a large number rendered in a pastel loses contrast, and
 * the number is the thing being read.
 */
const LABEL_TONES: Record<Tone, string> = {
  neutral: 'text-ink-500 dark:text-ink-400',
  blush: 'text-blush-700 dark:text-blush-300',
  lilac: 'text-lilac-700 dark:text-lilac-300',
  mint: 'text-mint-700 dark:text-mint-300',
  peach: 'text-peach-700 dark:text-peach-300',
  brick: 'text-brick-700 dark:text-brick-300',
};

const RULE_TONES: Record<Tone, string> = {
  neutral: 'bg-ink-300 dark:bg-ink-600',
  blush: 'bg-blush-400',
  lilac: 'bg-lilac-400',
  mint: 'bg-mint-400',
  peach: 'bg-peach-400',
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
      <p className="mt-2 font-display text-3xl tabular-nums text-ink-900 dark:text-ink-50">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p> : null}
    </Card>
  );
}

function TrendBadge({ pctChange }: { pctChange: number | null }) {
  if (pctChange === null) {
    return <span className="text-2xs text-ink-400 dark:text-ink-500">new</span>;
  }

  const flat = Math.abs(pctChange) < 1;
  const up = pctChange >= 0;
  const color = flat
    ? 'text-ink-400 dark:text-ink-500'
    : up
      ? 'text-mint-700 dark:text-mint-300'
      : 'text-brick-700 dark:text-brick-300';

  return (
    <span className={`flex items-center gap-0.5 text-2xs font-medium tabular-nums ${color}`}>
      {flat ? '' : up ? '▲' : '▼'} {Math.abs(pctChange).toFixed(0)}%
    </span>
  );
}
