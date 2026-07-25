import { Skeleton, SkeletonField } from '@/components/ui/skeleton';

function SectionSkeleton({ fields = 2, columns = 1 }: { fields?: number; columns?: 1 | 2 }) {
  return (
    <section className="surface-panel space-y-4 p-5 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className={columns === 2 ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
        {Array.from({ length: fields }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </div>
    </section>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <span className="sr-only">Loading career profile</span>

      <div className="space-y-8">
        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <SkeletonField />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-[96px] w-full" />
          </div>
        </section>

        <SectionSkeleton fields={4} columns={2} />
        <SectionSkeleton fields={4} columns={2} />
        <SectionSkeleton fields={2} columns={2} />

        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3.5 w-60" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-9 w-28" />
        </section>

        <div className="border-t border-border pt-6">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface-panel space-y-4 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      </aside>
    </div>
  );
}
