import { CardSkeleton, CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <CardSkeleton />
      <CardGridSkeleton count={3} />
    </div>
  );
}
