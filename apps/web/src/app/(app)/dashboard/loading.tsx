import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading dashboard</span>

      <div className="space-y-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-80 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="surface-panel space-y-3 p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
