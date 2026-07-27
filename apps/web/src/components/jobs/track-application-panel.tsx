'use client';

import Link from 'next/link';
import { KanbanSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  createApplication,
  listApplications,
  type Application,
} from '@/lib/api-client';

export function TrackApplicationPanel({ jobId }: { jobId: string }) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listApplications()
      .then(({ applications }) => {
        if (cancelled) return;
        setApplication(applications.find((row) => row.jobId === jobId) ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load tracker');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function track() {
    setPending(true);
    setError(null);
    try {
      const created = await createApplication({ jobId });
      setApplication(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to tracker');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Track application</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add this role to your pipeline and move it through interview stages.
          </p>
        </div>
        <KanbanSquare className="h-4 w-4 shrink-0 text-primary" />
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Checking tracker…</p>
      ) : application ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground">
            In pipeline · <span className="font-medium">{application.stageLabel}</span>
          </p>
          {application.draft && (
            <p className="text-xs text-muted-foreground">
              Linked cover-letter draft ({application.draft.status})
            </p>
          )}
          <Button asChild size="sm">
            <Link href="/applications">Open tracker</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button size="sm" disabled={pending} onClick={() => void track()}>
            {pending ? <Spinner size="sm" /> : <KanbanSquare className="h-4 w-4" />}
            {pending ? 'Adding…' : 'Add to pipeline'}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
