import { JobListSkeleton } from '@/components/jobs/job-browser';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-11 w-full" />
      <JobListSkeleton />
    </div>
  );
}
