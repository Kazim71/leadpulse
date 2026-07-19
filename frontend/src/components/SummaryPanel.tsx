import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { ACCENT_TONES, Badge, categoryTone, statusTone } from './ui/Badge';
import type { OrgSummary } from '@/lib/queries';

/** Chart-series fills, in the accent rotation order. */
const BAR_TONES = ['bg-blush-400', 'bg-lilac-400', 'bg-mint-400', 'bg-peach-400'];

const DOT_TONES: Record<string, string> = {
  neutral: 'bg-ink-400',
  blush: 'bg-blush-400',
  lilac: 'bg-lilac-400',
  mint: 'bg-mint-400',
  peach: 'bg-peach-400',
  brick: 'bg-brick-300',
};

/** Presentational only — receives the computed summary as props. */
export function SummaryPanel({ summary }: { summary: OrgSummary }) {
  const identifiedPct =
    summary.eventCount === 0
      ? 0
      : Math.round((summary.identifiedEventCount / summary.eventCount) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={summary.contactCount} tone="blush" />
        <StatCard label="Events" value={summary.eventCount} tone="lilac" />
        <StatCard
          label="Identified"
          value={`${identifiedPct}%`}
          hint={`${summary.identifiedEventCount} of ${summary.eventCount} events linked`}
          tone="mint"
        />
        <StatCard label="Anonymous events" value={summary.anonymousEventCount} tone="peach" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-ink-900 dark:text-ink-100">Events by type</h3>
          </CardHeader>
          <CardBody>
            {summary.eventsByType.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">No events recorded.</p>
            ) : (
              <ul className="space-y-2.5">
                {summary.eventsByType.map((row, i) => {
                  const max = summary.eventsByType[0]?.count || 1;
                  // Series colour rotates through the accent family so
                  // adjacent bars are distinguishable at a glance.
                  const bar = BAR_TONES[i % BAR_TONES.length];
                  return (
                    <li key={row.type}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink-700 dark:text-ink-300">{row.type}</span>
                        <span className="tabular-nums text-ink-500 dark:text-ink-400">{row.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div
                          className={`h-full rounded-full ${bar}`}
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-ink-900 dark:text-ink-100">Top locations</h3>
          </CardHeader>
          <CardBody>
            {summary.topCities.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">No location data captured.</p>
            ) : (
              <ul className="space-y-2">
                {summary.topCities.map((row) => (
                  <li key={row.city} className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${DOT_TONES[categoryTone(row.city)]}`} />
                      {row.city}
                    </span>
                    <span className="tabular-nums text-ink-500 dark:text-ink-400">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-ink-900 dark:text-ink-100">Lead status</h3>
          </CardHeader>
          <CardBody>
            {summary.statusBreakdown.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">No contacts yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {summary.statusBreakdown.map((row) => (
                  <li key={row.status} className="flex items-center justify-between">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    <span className="text-sm tabular-nums text-ink-600 dark:text-ink-400">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
