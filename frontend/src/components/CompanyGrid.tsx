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
                  ? 'bg-cinnamon-600 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-600 hover:border-cinnamon-300 hover:text-cinnamon-700 dark:border-neutral-700 dark:bg-black dark:text-neutral-300 dark:hover:text-cinnamon-300'
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
            className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-cinnamon-300 hover:shadow-raised dark:border-neutral-800 dark:bg-black dark:hover:border-cinnamon-700"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl text-black group-hover:text-cinnamon-700 dark:text-white dark:group-hover:text-cinnamon-400">
                {org.name}
              </h3>
              {org.industry ? <Badge tone={categoryTone(org.industry)}>{org.industry}</Badge> : null}
            </div>
            <p className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">{org.slug}</p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-2xl tabular-nums text-black dark:text-neutral-100">
                {contactCounts[org.id] ?? 0}
              </span>
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                contacts
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
