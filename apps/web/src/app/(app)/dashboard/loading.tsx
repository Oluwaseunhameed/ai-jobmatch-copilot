import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-10">
      <span className="sr-only">Loading dashboard</span>

      <div className="space-y-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-80 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>

        <div className="surface-panel space-y-4 p-5 sm:p-6">
          <Skeleton className="h-3 w-20" />
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-12" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="space-y-0 divide-y divide-border border-y border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
