import { ApplicationBoardSkeleton } from '@/components/applications/application-board-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApplicationsLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading applications</span>
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-9 w-80 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <ApplicationBoardSkeleton />
    </div>
  );
}
