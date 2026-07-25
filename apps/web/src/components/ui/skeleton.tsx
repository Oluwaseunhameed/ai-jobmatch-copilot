import * as React from 'react';

import { cn } from '@/lib/utils';

/** Shimmering placeholder used while content loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton', className)} {...props} />;
}

/** Skeleton shaped like a Label + Input pair. */
export function SkeletonField({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** Skeleton lines for paragraph-like content. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
