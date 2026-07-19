import { CardSkeleton, StatCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton height="h-40" />
        <CardSkeleton height="h-40" />
        <CardSkeleton height="h-40" />
      </div>
    </div>
  );
}
