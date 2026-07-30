import { Skeleton } from '@/components/ui/skeleton';

/** Shown while the authenticated app shell (auth + preferences) resolves. */
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
