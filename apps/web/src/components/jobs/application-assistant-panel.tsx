'use client';

import Link from 'next/link';
import { ArrowRight, Check, Copy, Download, PenLine } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getApplicationDraft,
  getLatestApplicationDraft,
  listResumes,
  startApplicationDraft,
  type ApplicationDraft,
  type Resume,
} from '@/lib/api-client';

const POLL_MS = 2_500;
/** ~5 minutes — covers cold Ollama starts behind the 180s LLM timeout. */
const MAX_POLLS = 120;

export function ApplicationAssistantPanel({ jobId }: { jobId: string }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplicationDraft | null>(null);
  const [copied, setCopied] = useState<'letter' | number | null>(null);

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

  const authFailed = /unauthorized|unauthenticated|sign.?in/i.test(error ?? '');

  const poll = useCallback(async (draft: ApplicationDraft) => {
    let current = draft;
    for (let i = 0; i < MAX_POLLS; i += 1) {
      if (current.status === 'ready' || current.status === 'failed') {
        setResult(current);
        setRunning(false);
        if (current.status === 'failed') {
          setError(current.error ?? 'Generation failed');
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      current = await getApplicationDraft(draft.id);
      setResult(current);
    }
    setRunning(false);
    setError('Generation is taking longer than expected. Refresh and try again.');
  }, []);

  useEffect(() => {
    if (!resumeId || !jobId) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setLoadingLatest(true);
    setError(null);
    setResult(null);
    setCopied(null);

    void getLatestApplicationDraft(resumeId, jobId)
      .then((latest) => {
        if (cancelled) return;
        setResult(latest);
        if (latest.status === 'queued' || latest.status === 'processing') {
          setRunning(true);
          void poll(latest);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        if (!message.toLowerCase().includes('no draft')) {
          setError(message || 'Could not load previous draft');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLatest(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resumeId, jobId, poll]);

  async function run() {
    if (!resumeId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setCopied(null);
    try {
      const started = await startApplicationDraft(resumeId, jobId);
      setResult(started);
      await poll(started);
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : 'Could not start generation');
    }
  }

  async function copyText(text: string, key: 'letter' | number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2_000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Application assistant
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft a cover letter and short answers tailored to this role.
          </p>
        </div>
        <PenLine className="h-4 w-4 shrink-0 text-primary" />
      </div>

      {loadingList ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading resumes…</p>
      ) : authFailed ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your session could not be verified for this panel. Refresh the page, or continue from
            the dashboard if sign-in is still syncing.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : resumes.length === 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload and parse a resume first, then generate application materials here.
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
            {running ? <Spinner size="sm" /> : <PenLine className="h-4 w-4" />}
            {running
              ? 'Generating…'
              : result?.status === 'ready'
                ? 'Regenerate cover letter'
                : 'Generate cover letter'}
          </Button>
          {loadingLatest && (
            <p className="text-xs text-muted-foreground">Loading previous draft…</p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (result.status === 'queued' || result.status === 'processing') && (
        <p className="mt-4 text-sm text-muted-foreground">
          {result.status === 'queued' ? 'Queued…' : 'Writing your draft…'}
        </p>
      )}

      {result?.status === 'ready' && result.coverLetter && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          {result.llm?.enabled && !result.llm.used && result.llm.error && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
              AI rewrite unavailable ({result.llm.error}). Showing a template draft instead.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cover letter
                {result.source === 'template' ? ' · template' : result.source === 'llm' ? ' · AI' : ''}
              </p>
              <div className="flex items-center gap-1">
                <Button asChild size="sm" variant="ghost">
                  <a
                    href={`/api/users/me/application-drafts/${result.id}/export`}
                    download
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void copyText(result.coverLetter!, 'letter')}
                >
                  {copied === 'letter' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'letter' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-foreground">
              {result.coverLetter}
            </pre>
          </div>

          {result.answers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Short answers
              </p>
              {result.answers.map((item, index) => (
                <div key={`${item.question}-${index}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.question}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => void copyText(item.answer, index)}
                    >
                      {copied === index ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
