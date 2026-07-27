'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getResumeOptimization,
  listResumes,
  startResumeOptimize,
  type Resume,
  type ResumeOptimization,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

const POLL_MS = 2_500;
/** ~5 minutes — covers cold Ollama starts behind the 180s LLM timeout. */
const MAX_POLLS = 120;

export function ResumeOptimizePanel({ jobId }: { jobId: string }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeOptimization | null>(null);

  useEffect(() => {
    void listResumes()
      .then((list) => {
        const ready = list.filter((resume) => resume.parseStatus === 'ready');
        setResumes(ready);
        const primary = ready.find((resume) => resume.isPrimary) ?? ready[0];
        if (primary) setResumeId(primary.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load resumes');
      })
      .finally(() => setLoadingList(false));
  }, []);

  const poll = useCallback(async (optimization: ResumeOptimization) => {
    let current = optimization;
    for (let i = 0; i < MAX_POLLS; i += 1) {
      if (current.status === 'ready' || current.status === 'failed') {
        setResult(current);
        setRunning(false);
        if (current.status === 'failed') {
          setError(current.error ?? 'Optimisation failed');
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      current = await getResumeOptimization(optimization.resumeId, optimization.id);
      setResult(current);
    }
    setRunning(false);
    setError('Optimisation is taking longer than expected. Refresh and try again.');
  }, []);

  async function run() {
    if (!resumeId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const started = await startResumeOptimize(resumeId, jobId);
      setResult(started);
      await poll(started);
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : 'Could not start optimisation');
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Optimize resume</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tailor a parsed resume to this role and compare keyword-fit scores.
          </p>
        </div>
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      </div>

      {loadingList ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading resumes…</p>
      ) : resumes.length === 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload and parse a resume first, then come back to optimise it for this job.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/resumes">
              Open resumes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resume
            </span>
            <select
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
              disabled={running}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                  {resume.isPrimary ? ' (primary)' : ''}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" disabled={running || !resumeId} onClick={() => void run()}>
            {running ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
            {running ? 'Optimising…' : 'Optimize for this role'}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (result.status === 'queued' || result.status === 'processing') && (
        <p className="mt-4 text-sm text-muted-foreground">
          {result.status === 'queued' ? 'Queued…' : 'Working on your tailored version…'}
        </p>
      )}

      {result?.status === 'ready' && result.before && result.after && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-end gap-6">
            <Score label="Before" value={result.before.atsScore.score} />
            <Score
              label="After"
              value={result.after.atsScore.score}
              emphasis={result.after.atsScore.score >= (result.before.atsScore.score ?? 0)}
            />
            <p className="text-xs text-muted-foreground">
              Keyword fit vs this job’s skills — not an official ATS vendor score.
            </p>
          </div>

          {result.llm?.enabled && !result.llm.used && result.llm.error && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
              AI rewrite unavailable ({result.llm.error}). Showing heuristic keyword tips instead.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Snapshot title="Before" snapshot={result.before} />
            <Snapshot title="After" snapshot={result.after} highlight />
          </div>

          <Button asChild size="sm" variant="outline">
            <Link href="/resumes">
              View saved version in resumes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Score({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-display text-3xl font-semibold tabular-nums',
          emphasis ? 'text-success' : 'text-foreground',
        )}
      >
        {value}
        <span className="ml-1 text-sm font-medium text-muted-foreground">%</span>
      </p>
    </div>
  );
}

function Snapshot({
  title,
  snapshot,
  highlight,
}: {
  title: string;
  snapshot: NonNullable<ResumeOptimization['before']>;
  highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border border-border p-3', highlight && 'bg-primary/5')}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {snapshot.headline && <p className="mt-2 text-sm font-medium">{snapshot.headline}</p>}
      {snapshot.summary && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{snapshot.summary}</p>
      )}
      {snapshot.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {snapshot.skills.slice(0, 12).map((skill) => (
            <span key={skill} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      )}
      {snapshot.atsScore.missingKeywords.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Missing: {snapshot.atsScore.missingKeywords.slice(0, 6).join(', ')}
        </p>
      )}
    </div>
  );
}
