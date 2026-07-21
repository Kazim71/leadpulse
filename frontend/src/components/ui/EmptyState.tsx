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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center dark:border-neutral-700 dark:bg-black/40">
      <h3 className="font-display text-xl text-black dark:text-neutral-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
