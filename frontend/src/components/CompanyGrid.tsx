'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, categoryTone } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import type { Organization } from '@/lib/queries';

/**
 * Presentational + local filter state only. Filtering happens in memory over
 * an already-fetched list; at tenant counts where that stops being viable,
 * this becomes a server-side query param instead.
 */
export function CompanyGrid({
  organizations,
  contactCounts,
}: {
  organizations: Organization[];
  contactCounts: Record<string, number>;
}) {
  const [industry, setIndustry] = useState<string>('all');

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const org of organizations) if (org.industry) set.add(org.industry);
    return ['all', ...[...set].sort()];
  }, [organizations]);

  const visible = useMemo(
    () => (industry === 'all' ? organizations : organizations.filter((o) => o.industry === industry)),
    [organizations, industry],
  );

  if (organizations.length === 0) {
    return (
      <EmptyState
        title="No organizations yet"
        description="Once a company is onboarded it will appear here with its lead volume."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {industries.map((value) => {
          const active = value === industry;
          return (
            <button
              key={value}
              onClick={() => setIndustry(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                active
                  ? 'bg-blush-600 text-white'
                  : 'border border-ink-200 bg-white text-ink-600 hover:border-blush-300 hover:text-blush-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:text-blush-300'
              }`}
            >
              {value === 'all' ? 'All industries' : value}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((org) => (
          <Link
            key={org.id}
            href={`/super-admin/org/${org.id}`}
            className="group rounded-xl border border-ink-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-blush-300 hover:shadow-raised dark:border-ink-800 dark:bg-ink-900 dark:hover:border-blush-700"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl text-ink-900 group-hover:text-blush-700 dark:text-ink-50 dark:group-hover:text-blush-400">
                {org.name}
              </h3>
              {org.industry ? <Badge tone={categoryTone(org.industry)}>{org.industry}</Badge> : null}
            </div>
            <p className="mt-1 font-mono text-xs text-ink-500 dark:text-ink-400">{org.slug}</p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-2xl tabular-nums text-ink-900 dark:text-ink-100">
                {contactCounts[org.id] ?? 0}
              </span>
              <span className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400">
                contacts
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
