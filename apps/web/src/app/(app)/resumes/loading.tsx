import { ResumeLibrarySkeleton } from '@/components/resumes/resume-library-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResumesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-9 w-80 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <ResumeLibrarySkeleton />
    </div>
  );
}
