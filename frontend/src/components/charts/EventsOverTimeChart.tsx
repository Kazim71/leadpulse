'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { DailyCount } from '@/lib/queries';

/**
 * WHY recharts: it's an SVG (not canvas) React charting library with no
 * peer dependency beyond React/D3-internals it bundles itself, so it drops
 * in without a second rendering pipeline. It composes as JSX (matching
 * every other component in this codebase) rather than an imperative
 * canvas API, and its Tooltip/ResponsiveContainer handle the two things
 * that are otherwise the most tedious to hand-roll correctly.
 */

const dateFormatter = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * A Tailwind-classed tooltip instead of recharts' `contentStyle` (inline
 * styles), so `dark:` actually applies — the same constraint that shaped
 * the fill/stroke color choice above.
 */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-xs shadow-raised dark:border-ink-700 dark:bg-ink-900">
      <p className="font-medium text-ink-900 dark:text-ink-100">{dateFormatter(label)}</p>
      <p className="text-ink-600 dark:text-ink-400">{payload[0].value} events</p>
    </div>
  );
}

export function EventsOverTimeChart({ data }: { data: DailyCount[] }) {
  const hasAnyEvents = data.some((d) => d.count > 0);

  if (!hasAnyEvents) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-500 dark:text-ink-400">
        No events in this window yet.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {/* blush-400, not -500/-600: recharts fills are inline SVG attrs
                and can't take a `dark:` variant, so one shade has to work on
                both cream and near-black. -400 keeps enough contrast on both
                without needing a theme-conditional color prop. */}
            <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DA8093" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#DA8093" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-ink-200 dark:stroke-ink-800" />
          <XAxis
            dataKey="date"
            tickFormatter={dateFormatter}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-ink-500 dark:text-ink-400"
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-ink-500 dark:text-ink-400"
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#DA8093"
            strokeWidth={2}
            fill="url(#eventsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
