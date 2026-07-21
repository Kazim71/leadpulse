'use client';

import { useState } from 'react';
import { Badge, statusTone } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import type { Lead } from '@/lib/queries';

/**
 * Purely presentational. Receives leads as props and owns nothing but the
 * expanded-row UI state — it never touches Supabase. The page component
 * fetches and passes down, so this stays trivially testable and reusable
 * between the org-admin view and the super-admin's per-org view.
 */
export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Once the tracking snippet identifies a visitor, they'll appear here with their full activity trail."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-black">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-white text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-black/50 dark:text-neutral-400">
            <th className="px-5 py-3 font-medium">Lead</th>
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-5 py-3 font-medium">Location</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium">Events</th>
            <th className="px-5 py-3 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {leads.map((lead) => {
            const isOpen = expanded === lead.id;
            return (
              <>
                <tr
                  key={lead.id}
                  onClick={() => setExpanded(isOpen ? null : lead.id)}
                  className="cursor-pointer transition-colors hover:bg-cinnamon-50/60 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-black dark:text-neutral-100">
                      {lead.name ?? 'Unnamed lead'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    <div className="flex flex-col">
                      {lead.phone ? <span className="tabular-nums">{lead.phone}</span> : null}
                      {lead.email ? <span className="text-xs">{lead.email}</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={statusTone(lead.message_status)}>{lead.message_status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                    {lead.eventCount}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    {lead.last_seen ? new Date(lead.last_seen).toLocaleString() : '—'}
                  </td>
                </tr>

                {isOpen ? (
                  <tr key={`${lead.id}-detail`} className="bg-white/70 dark:bg-black/40">
                    <td colSpan={6} className="px-5 py-4">
                      <p className="mb-3 text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Recent activity
                      </p>
                      {lead.recentEvents.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No events recorded for this lead yet.
                        </p>
                      ) : (
                        <ol className="space-y-2">
                          {lead.recentEvents.map((event) => (
                            <li key={event.id} className="flex items-baseline gap-3 text-sm">
                              <span className="w-2 flex-none">
                                <span className="block h-1.5 w-1.5 rounded-full bg-cinnamon-500" />
                              </span>
                              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                {event.event_type}
                              </span>
                              <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {event.url ?? ''}
                              </span>
                              <span className="ml-auto flex-none text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                                {new Date(event.created_at).toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
