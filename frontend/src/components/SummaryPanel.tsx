import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard, type StatTrend } from './ui/StatCard';
import { Badge, categoryTone, statusTone } from './ui/Badge';
import { EventsOverTimeChart } from './charts/EventsOverTimeChart';
import type { DailyCount, OrgSummary } from '@/lib/queries';

/** Chart-series fills, in the accent rotation order (matches Badge.tsx's ACCENT_TONES — cinnamon is reserved for primary actions, not this categorical rotation). */
const BAR_TONES = ['bg-violet-400', 'bg-emerald-400', 'bg-amber-400'];

const DOT_TONES: Record<string, string> = {
  neutral: 'bg-neutral-400',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  brick: 'bg-brick-300',
};

/**
 * Presentational only — receives the computed summary as props.
 *
 * `eventsOverTime` and `eventTrend` are optional so any caller that hasn't
 * been updated to fetch them still compiles and renders — they simply lose
 * the chart/trend badge rather than breaking.
 */
export function SummaryPanel({
  summary,
  eventsOverTime,
  eventTrend,
}: {
  summary: OrgSummary;
  eventsOverTime?: DailyCount[];
  eventTrend?: StatTrend;
}) {
  const identifiedPct =
    summary.eventCount === 0
      ? 0
      : Math.round((summary.identifiedEventCount / summary.eventCount) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={summary.contactCount} tone="cinnamon" />
        <StatCard label="Events" value={summary.eventCount} tone="violet" trend={eventTrend} />
        <StatCard
          label="Identified"
          value={`${identifiedPct}%`}
          hint={`${summary.identifiedEventCount} of ${summary.eventCount} events linked`}
          tone="emerald"
        />
        <StatCard label="Anonymous events" value={summary.anonymousEventCount} tone="amber" />
      </div>

      {eventsOverTime ? (
        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-black dark:text-neutral-100">
              Events, last {eventsOverTime.length} days
            </h3>
          </CardHeader>
          <CardBody>
            <EventsOverTimeChart data={eventsOverTime} />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-black dark:text-neutral-100">Events by type</h3>
          </CardHeader>
          <CardBody>
            {summary.eventsByType.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No events recorded.</p>
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
                        <span className="text-neutral-700 dark:text-neutral-300">{row.type}</span>
                        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{row.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
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
            <h3 className="font-display text-lg text-black dark:text-neutral-100">Top locations</h3>
          </CardHeader>
          <CardBody>
            {summary.topCities.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No location data captured.</p>
            ) : (
              <ul className="space-y-2">
                {summary.topCities.map((row) => (
                  <li key={row.city} className="flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${DOT_TONES[categoryTone(row.city)]}`} />
                      {row.city}
                    </span>
                    <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display text-lg text-black dark:text-neutral-100">Lead status</h3>
          </CardHeader>
          <CardBody>
            {summary.statusBreakdown.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No contacts yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {summary.statusBreakdown.map((row) => (
                  <li key={row.status} className="flex items-center justify-between">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
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
