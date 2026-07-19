import { CardSkeleton, StatCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-1 h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton />
      <div>
        <Skeleton className="mb-4 h-7 w-24" />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}
