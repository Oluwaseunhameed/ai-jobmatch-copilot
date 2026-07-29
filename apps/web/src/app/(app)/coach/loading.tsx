import { Skeleton } from '@/components/ui/skeleton';

export default function CoachLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Session cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
