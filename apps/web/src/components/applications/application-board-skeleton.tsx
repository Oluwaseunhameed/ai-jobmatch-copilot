import { Skeleton } from '@/components/ui/skeleton';

export function ApplicationBoardSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading application pipeline</span>
      <Skeleton className="h-3.5 w-72" />
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, column) => (
          <div
            key={column}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-border/80 bg-muted/20"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-6 rounded-md" />
            </div>
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: column === 0 ? 2 : 1 }).map((__, card) => (
                <div key={card} className="space-y-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
              {column > 1 && <Skeleton className="mx-auto my-6 h-3 w-12" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
