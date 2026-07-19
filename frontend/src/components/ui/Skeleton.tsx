/**
 * Pulsing placeholder block. Used by each route's loading.tsx so
 * navigation shows a shaped skeleton instead of a blank flash while the
 * Server Component fetches — Next.js renders loading.tsx immediately while
 * the page's own data request is in flight.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-200 dark:bg-ink-800 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <Skeleton className="mb-2.5 h-0.5 w-6" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}

export function CardSkeleton({ height = 'h-56' }: { height?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <Skeleton className="mb-4 h-5 w-32" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
      <div className="border-b border-ink-200 bg-ink-50 px-5 py-3 dark:border-ink-800 dark:bg-ink-950/50">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-ink-200 dark:divide-ink-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-20" />
          <Skeleton className="mt-5 h-8 w-12" />
        </div>
      ))}
    </div>
  );
}
