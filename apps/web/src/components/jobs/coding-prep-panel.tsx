'use client';

import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  createCodingSession,
  listCodingSessions,
  type CodingPracticeSession,
} from '@/lib/api-client';

export function CodingPrepPanel({ jobId }: { jobId: string }) {
  const [session, setSession] = useState<CodingPracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listCodingSessions(jobId)
      .then((res) => setSession(res.codingSessions[0] ?? null))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load coding prep');
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function startSession() {
    setPending(true);
    setError(null);
    try {
      const created = await createCodingSession({ jobId });
      setSession(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start coding prep');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center gap-2">
        <Code2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Coding prep</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Timed LeetCode / HackerRank / take-home style drills tailored to this role, with a review
        checklist and performance score.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading…
        </div>
      ) : session ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {session.problems.length} problems · {session.timeBudgetMinutes ?? '—'} min budget
            {typeof session.performanceScore === 'number'
              ? ` · ${session.performanceScore}% score`
              : ''}
          </p>
          <Button asChild size="sm">
            <Link href={`/practice/${session.id}`}>Continue practice</Link>
          </Button>
        </div>
      ) : (
        <Button className="mt-4" size="sm" disabled={pending} onClick={() => void startSession()}>
          {pending ? <Spinner size="sm" /> : null}
          Generate coding pack
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
