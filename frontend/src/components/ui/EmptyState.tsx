import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50/60 px-6 py-14 text-center dark:border-ink-700 dark:bg-ink-900/40">
      <h3 className="font-display text-xl text-ink-900 dark:text-ink-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-600 dark:text-ink-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
