'use client';

import Link from 'next/link';
import { Bookmark, BookmarkCheck, Briefcase, MapPin } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  formatPostedAt,
  formatSalary,
  saveJob,
  searchJobs,
  unsaveJob,
  type Job,
  type JobSearchFacet,
  type JobSearchResult,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

const WORK_MODES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on-site', label: 'On-site' },
];

const SENIORITIES = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
];

type SortOption = 'relevance' | 'recent' | 'salary';

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function facetCount(facets: JobSearchFacet[], value: string) {
  return facets.find((facet) => facet.value === value)?.count;
}

export function JobBrowser() {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [workMode, setWorkMode] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<JobSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await searchJobs({
        q: query || undefined,
        workMode: workMode.length ? workMode : undefined,
        seniority: seniority.length ? seniority : undefined,
        sort,
        page,
        limit: 12,
      });
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, workMode, seniority, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!result) return 1;
    return Math.max(1, Math.ceil(result.total / result.limit));
  }, [result]);

  async function toggleSave(job: Job) {
    setPendingSlug(job.slug);
    try {
      if (job.isSaved) {
        await unsaveJob(job.slug);
      } else {
        await saveJob(job.slug);
      }
      setResult((current) =>
        current
          ? {
              ...current,
              jobs: current.jobs.map((item) =>
                item.id === job.id ? { ...item, isSaved: !job.isSaved } : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved jobs');
    } finally {
      setPendingSlug(null);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search roles, skills, companies…"
          className="h-11"
          aria-label="Search jobs"
        />
        <Button type="submit" className="h-11 sm:w-28">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {WORK_MODES.map((mode) => {
          const active = workMode.includes(mode.value);
          const count = result ? facetCount(result.facets.workMode, mode.value) : undefined;
          return (
            <FilterChip
              key={mode.value}
              label={mode.label}
              count={count}
              active={active}
              onClick={() => {
                setPage(1);
                setWorkMode((current) => toggleValue(current, mode.value));
              }}
            />
          );
        })}
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
        {SENIORITIES.map((level) => {
          const active = seniority.includes(level.value);
          const count = result ? facetCount(result.facets.seniority, level.value) : undefined;
          return (
            <FilterChip
              key={level.value}
              label={level.label}
              count={count}
              active={active}
              onClick={() => {
                setPage(1);
                setSeniority((current) => toggleValue(current, level.value));
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Searching…'
            : result
              ? `${result.total} role${result.total === 1 ? '' : 's'}${
                  query ? ` for “${query}”` : ''
                } · ${result.mode === 'hybrid' ? 'keyword + semantic' : result.mode}`
              : null}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sort
          </label>
          <select
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value as SortOption);
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="recent">Most recent</option>
            <option value="salary">Salary</option>
          </select>
        </div>
      </div>

      {result?.degradedReason && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {result.degradedReason}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && !result ? (
        <JobListSkeleton />
      ) : result && result.jobs.length === 0 ? (
        <div className="surface-panel px-6 py-16 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-display text-xl font-semibold">No matching roles</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader query, or clear a filter.
          </p>
        </div>
      ) : (
        <div className={cn('grid gap-4', loading && 'opacity-60')}>
          {result?.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              pending={pendingSlug === job.slug}
              onToggleSave={() => void toggleSave(job)}
            />
          ))}
        </div>
      )}

      {result && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span className="tabular-nums text-xs opacity-70">{count}</span>
      )}
    </button>
  );
}

function JobCard({
  job,
  pending,
  onToggleSave,
}: {
  job: Job;
  pending: boolean;
  onToggleSave: () => void;
}) {
  const salary = formatSalary(job);

  return (
    <article className="surface-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>{job.company.name}</span>
            <span aria-hidden>·</span>
            <span>{formatPostedAt(job.postedAt)}</span>
          </div>
          <Link
            href={`/jobs/${job.slug}`}
            className="font-display text-xl font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {job.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            <span className="capitalize">{job.workMode.replace('-', ' ')}</span>
            <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
            {salary && <span>{salary}</span>}
          </div>
          <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {job.description}
          </p>
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          <Button asChild size="sm">
            <Link href={`/jobs/${job.slug}`}>View</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onToggleSave}
            aria-label={job.isSaved ? 'Remove from saved' : 'Save job'}
          >
            {pending ? (
              <Spinner size="sm" />
            ) : job.isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {job.isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function JobListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="surface-panel space-y-3 p-5 sm:p-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
