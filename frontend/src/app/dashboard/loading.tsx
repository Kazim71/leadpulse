import { TableSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
