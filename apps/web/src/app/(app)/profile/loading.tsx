import { ProfileFormSkeleton } from '@/components/profile/profile-form-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-9 w-72 sm:h-10" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <ProfileFormSkeleton />
    </div>
  );
}
