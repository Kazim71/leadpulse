'use client';

import { useEffect, useRef, useState } from 'react';
import { BellIcon } from './icons';
import type { ReadySignalLead } from '@/lib/queries';

/**
 * Receives already-fetched data as a prop — this component makes no
 * Supabase calls itself. The parent layout (a Server Component) runs
 * getReadySignal()/getPlatformReadySignal() at request time and passes the
 * result down, same data-fetch-at-the-top pattern as every page in this
 * app. There is no polling: the count reflects the moment the page loaded,
 * consistent with the rest of the dashboard being request-time data rather
 * than live-updating.
 */
export function NotificationBell({ leads }: { leads: ReadySignalLead[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const count = leads.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-cinnamon-300 hover:text-cinnamon-700 dark:border-neutral-700 dark:bg-black dark:text-neutral-300 dark:hover:text-cinnamon-400"
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnamon-600 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-neutral-200 bg-white p-3 shadow-pop dark:border-neutral-700 dark:bg-black">
          <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Ready to contact · last 24h
          </p>
          {count === 0 ? (
            <p className="py-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No recently active leads are marked ready right now.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-md px-2 py-2 text-sm hover:bg-white dark:hover:bg-neutral-800"
                >
                  <p className="font-medium text-black dark:text-neutral-100">
                    {lead.name ?? 'Unnamed lead'}
                    {lead.organizationName ? (
                      <span className="ml-1.5 font-normal text-neutral-500 dark:text-neutral-400">
                        · {lead.organizationName}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {lead.city ?? 'Unknown location'}
                    {lead.last_seen ? ` · seen ${new Date(lead.last_seen).toLocaleString()}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
