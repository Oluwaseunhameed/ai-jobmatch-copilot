'use client';

import Link from 'next/link';
import { MessageSquareQuote } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  createInterviewPrep,
  listInterviewPreps,
  type InterviewPrep,
} from '@/lib/api-client';

export function InterviewPrepPanel({ jobId }: { jobId: string }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listInterviewPreps(jobId)
      .then((res) => setPrep(res.interviewPreps[0] ?? null))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load interview prep');
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function startPrep() {
    setPending(true);
    setError(null);
    try {
      const created = await createInterviewPrep(jobId);
      setPrep(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start interview prep');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center gap-2">
        <MessageSquareQuote className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Interview prep</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Role-specific behavioral, technical, and design questions with tips and a confidence score.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading…
        </div>
      ) : prep ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {prep.questions.length} questions · {prep.status}
            {typeof prep.confidenceScore === 'number' ? ` · ${prep.confidenceScore}% confidence` : ''}
          </p>
          <Button asChild size="sm">
            <Link href={`/interview/${prep.id}`}>Continue practice</Link>
          </Button>
        </div>
      ) : (
        <Button className="mt-4" size="sm" disabled={pending} onClick={() => void startPrep()}>
          {pending ? <Spinner size="sm" /> : null}
          Generate prep pack
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
