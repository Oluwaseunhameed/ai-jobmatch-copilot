'use client';

import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  createCodingSession,
  type CodingPracticeSession,
} from '@/lib/api-client';

export function CodingHubView({ sessions: initial }: { sessions: CodingPracticeSession[] }) {
  const [sessions, setSessions] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGeneral() {
    setPending(true);
    setError(null);
    try {
      const created = await createCodingSession({ limit: 6 });
      setSessions((current) => [created, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create session');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Coding assessment
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Practice under timed pressure
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Work LeetCode-style, HackerRank-style, and take-home prompts. Track minutes, mark
            outcomes, and use the review checklist as a lightweight code review. Full AI code
            review stays deferred.
          </p>
        </div>
        <Button disabled={pending} onClick={() => void startGeneral()}>
          {pending ? <Spinner size="sm" /> : null}
          New general pack
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {sessions.length === 0 ? (
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <p className="font-medium text-foreground">No practice sessions yet</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a general pack here, or open a job and click{' '}
            <span className="font-medium text-foreground">Generate coding pack</span>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/practice/${session.id}`}
                className="surface-panel block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {session.job?.companyName ?? 'General pack'}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {session.job?.title ?? 'Coding practice'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {session.problems.length} problems · {session.timeBudgetMinutes ?? '—'} min
                      {typeof session.performanceScore === 'number'
                        ? ` · ${session.performanceScore}% score`
                        : ''}{' '}
                      · {session.status}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">Open →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
