'use client';

import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  CODING_STYLE_LABELS,
  updateCodingAttempts,
  type CodingAttempt,
  type CodingPracticeSession,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

function styleLabel(style: string) {
  return CODING_STYLE_LABELS[style] ?? style;
}

export function CodingPracticeView({ session: initial }: { session: CodingPracticeSession }) {
  const [session, setSession] = useState(initial);
  const [pendingProblemId, setPendingProblemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | 'all'>('all');

  const attemptsById = useMemo(() => {
    return new Map(session.attempts.map((a) => [a.problemId, a]));
  }, [session.attempts]);

  const problems =
    filter === 'all' ? session.problems : session.problems.filter((p) => p.style === filter);

  async function saveAttempt(next: CodingAttempt) {
    if (pendingProblemId) return;
    setPendingProblemId(next.problemId);
    setError(null);
    const merged = [
      ...session.attempts.filter((a) => a.problemId !== next.problemId),
      next,
    ];
    try {
      const updated = await updateCodingAttempts(session.id, merged);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save attempt');
    } finally {
      setPendingProblemId(null);
    }
  }

  const performance = session.performance;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All coding practice
        </Link>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-primary">
            {session.job ? `${session.job.companyName} · ${session.job.title}` : 'General pack'}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Coding session
          </h1>
          {session.summary && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {session.summary}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Problems" value={String(session.problems.length)} />
          <Stat label="Status" value={session.status} />
          <Stat
            label="Score"
            value={typeof session.performanceScore === 'number' ? `${session.performanceScore}%` : '—'}
          />
          <Stat
            label="Time budget"
            value={`${session.timeBudgetMinutes ?? '—'} min`}
          />
        </div>

        {performance && (
          <p className="mt-4 text-sm text-muted-foreground">
            {performance.detail} Used {performance.timeUsedMinutes} of {performance.timeBudgetMinutes}{' '}
            minutes · solved {performance.solved}, attempted {performance.attempted}, skipped{' '}
            {performance.skipped}.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterChip>
        {session.styles.map((style) => (
          <FilterChip
            key={style}
            active={filter === style}
            onClick={() => setFilter(style)}
          >
            {styleLabel(style)}
          </FilterChip>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {problems.map((problem, index) => {
          const attempt = attemptsById.get(problem.id);
          const pending = pendingProblemId === problem.id;
          return (
            <li key={problem.id} className="surface-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>{styleLabel(problem.style)}</span>
                <span aria-hidden>·</span>
                <span className="capitalize">{problem.difficulty}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {problem.timeLimitMinutes} min
                </span>
                {attempt && attempt.status !== 'todo' && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="capitalize text-foreground">{attempt.status}</span>
                  </>
                )}
              </div>

              <p className="mt-3 font-display text-lg font-semibold tracking-tight">
                {index + 1}. {problem.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{problem.prompt}</p>

              {problem.examples.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Examples
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    {problem.examples.map((ex) => (
                      <li key={ex} className="font-mono text-xs sm:text-sm">
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">Hints & approach</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {problem.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Approach: </span>
                  {problem.approach}
                </p>
              </details>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Review checklist
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {problem.reviewChecklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {(['solved', 'attempted', 'skipped'] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={attempt?.status === status ? 'default' : 'outline'}
                    disabled={pending}
                    className="capitalize"
                    onClick={() =>
                      void saveAttempt({
                        problemId: problem.id,
                        status,
                        minutesSpent: attempt?.minutesSpent ?? null,
                        selfRating: attempt?.selfRating ?? null,
                        notes: attempt?.notes ?? null,
                      })
                    }
                  >
                    {status}
                  </Button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">Confidence</span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={attempt?.selfRating === value ? 'default' : 'outline'}
                    disabled={pending || !attempt || attempt.status === 'todo'}
                    onClick={() =>
                      void saveAttempt({
                        problemId: problem.id,
                        status:
                          attempt?.status && attempt.status !== 'todo'
                            ? attempt.status
                            : 'attempted',
                        minutesSpent: attempt?.minutesSpent ?? null,
                        selfRating: value,
                        notes: attempt?.notes ?? null,
                      })
                    }
                  >
                    {value}
                  </Button>
                ))}
                {pending && <Spinner size="sm" />}
              </div>
            </li>
          );
        })}
      </ul>

      {session.job && (
        <p className="text-sm text-muted-foreground">
          Back to{' '}
          <Link
            href={`/jobs/${session.job.slug}`}
            className="font-medium text-foreground hover:underline"
          >
            job posting
          </Link>
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight capitalize tabular-nums">
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground shadow-soft'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
