'use client';

import { CheckCircle2, Circle, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  approveApplyFill,
  confirmApplySubmitted,
  getApplyAssist,
  markApplyOpened,
  type ApplyAssistSession,
  type Application,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function ApplyAssistPanel({
  application,
  onApplicationUpdated,
}: {
  application: Application;
  onApplicationUpdated?: () => void;
}) {
  const [session, setSession] = useState<ApplyAssistSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<'open' | 'approve' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getApplyAssist(application.id)
      .then((next) => {
        if (!cancelled) setSession(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load apply assist');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [application.id]);

  async function run(
    actionKey: 'open' | 'approve' | 'confirm',
    action: () => Promise<ApplyAssistSession>,
  ) {
    setPendingAction(actionKey);
    setError(null);
    try {
      const next = await action();
      setSession(next);
      if (next.status === 'submitted') onApplicationUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setPendingAction(null);
    }
  }

  async function openApply() {
    const url = session?.applyUrl ?? application.job?.applyUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    await run('open', () => markApplyOpened(application.id));
  }

  async function copyField(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading assisted apply…
      </div>
    );
  }

  if (!session) {
    return error ? <p className="mt-5 text-sm text-destructive">{error}</p> : null;
  }

  const submitted = session.status === 'submitted';
  const pending = pendingAction != null;

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Assisted apply
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Checklist + approved fill plan. Playwright never submits without you — confirm after you
            apply.
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums text-foreground">
          {session.readinessPct}% ready
        </p>
      </div>

      <ul className="space-y-2">
        {session.checklist.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <Circle
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  item.required ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
            )}
            <div>
              <p className="font-medium text-foreground">
                {item.label}
                {item.required ? ' *' : ''}
              </p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {session.fillPlan.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fill plan (copy / approved for assist)
          </p>
          <ul className="space-y-2">
            {session.fillPlan.map((field) => (
              <li
                key={field.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {field.label}
                      {field.sensitive ? ' · sensitive' : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {field.value.length > 280 ? `${field.value.slice(0, 277)}…` : field.value}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyField(field.id, field.value)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === field.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {session.playwrightDetail ? (
        <p className="flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {session.playwrightDetail}
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!submitted ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending || !session.applyUrl}
              onClick={() => void openApply()}
            >
              {pendingAction === 'open' ? <Spinner size="sm" /> : null}
              Open apply page
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || session.status === 'fill_approved'}
              onClick={() => void run('approve', () => approveApplyFill(application.id))}
            >
              {pendingAction === 'approve' ? <Spinner size="sm" /> : null}
              Approve fill plan
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Confirmation note (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="Submitted on careers portal"
              />
            </label>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run('confirm', () =>
                  confirmApplySubmitted(application.id, { submitNote: note || null }),
                )
              }
            >
              {pendingAction === 'confirm' ? <Spinner size="sm" /> : null}
              I submitted this application
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-success">
          Submission confirmed
          {session.submittedAt
            ? ` · ${new Date(session.submittedAt).toLocaleString()}`
            : ''}
        </p>
      )}
    </div>
  );
}
