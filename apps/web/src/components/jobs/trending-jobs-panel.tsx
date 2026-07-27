'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { formatPostedAt, listTrendingJobs, type TrendingJob } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function matchTone(score: number) {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-muted-foreground';
}

export function TrendingJobsPanel({
  limit = 6,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  const [jobs, setJobs] = useState<TrendingJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listTrendingJobs({ limit, days: 14 })
      .then((res) => setJobs(res.jobs))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load trending jobs');
        setJobs([]);
      });
  }, [limit]);

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!jobs) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Trending roles appear as people save and view jobs. Browse the catalog to get started.
      </p>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/jobs/${job.slug}`}
          className="surface-panel block p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {job.companyName}
            </p>
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          </div>
          <p className="mt-2 font-display text-base font-semibold tracking-tight text-foreground">
            {job.title}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatPostedAt(job.postedAt)}
            {job.location ? ` · ${job.location}` : ''}
            {typeof job.matchScore === 'number' ? (
              <span className={cn('tabular-nums', matchTone(job.matchScore))}>
                {` · ${job.matchScore}% match`}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {job.saveCount} saved · {job.viewCount} viewed
          </p>
        </Link>
      ))}
    </div>
  );
}
