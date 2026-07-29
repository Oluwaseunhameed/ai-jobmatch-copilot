import { Skeleton } from '@/components/ui/skeleton';

export default function PracticeLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-80 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
