'use client';

import Link from 'next/link';
import { Bookmark, Briefcase, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  formatPostedAt,
  formatSalary,
  listSavedJobs,
  unsaveJob,
  type Job,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

function matchTone(score: number) {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-muted-foreground';
}

export function SavedJobsView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSavedJobs();
      setJobs(res.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(job: Job) {
    setPendingSlug(job.slug);
    try {
      await unsaveJob(job.slug);
      setJobs((current) => current.filter((item) => item.id !== job.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unsave job');
    } finally {
      setPendingSlug(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Saved jobs</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Roles you’re tracking
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Everything you’ve bookmarked from search and job detail. Unsave anytime.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading saved jobs" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="surface-panel px-6 py-16 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-display text-xl font-semibold">No saved roles yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Bookmark jobs from search to keep them here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/jobs">Find roles</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/60 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.slug}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {job.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{job.company.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 capitalize">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.workMode.replace('-', ' ')}
                  </span>
                  {job.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  ) : null}
                  {job.postedAt ? <span>{formatPostedAt(job.postedAt)}</span> : null}
                  {formatSalary(job) ? <span>{formatSalary(job)}</span> : null}
                  {typeof job.matchScore === 'number' ? (
                    <span className={cn('font-medium', matchTone(job.matchScore))}>
                      {job.matchScore}% match
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/jobs/${job.slug}`}>Open</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendingSlug === job.slug}
                  onClick={() => void remove(job)}
                >
                  {pendingSlug === job.slug ? <Spinner size="sm" /> : 'Unsave'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
