'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  COACH_FOCUS_LABELS,
  sendCoachMessage,
  type CareerCoachSession,
  type CoachFocus,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function CoachSessionView({ session: initial }: { session: CareerCoachSession }) {
  const [session, setSession] = useState(initial);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.messages.length, pending]);

  async function send(message?: string) {
    const text = (message ?? draft).trim();
    if (!text || pending) return;

    setPending(true);
    setError(null);
    setDraft('');
    try {
      const next = await sendCoachMessage(session.id, text);
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message');
      setDraft(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Link
          href="/coach"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← All sessions
        </Link>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {COACH_FOCUS_LABELS[session.focus as CoachFocus] ?? session.focus}
          {session.source === 'llm' ? ' · AI' : ' · template'}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {session.title ?? 'Coaching session'}
        </h1>
        {session.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{session.summary}</p>
        ) : null}
      </div>

      <div className="surface-panel flex min-h-[28rem] flex-col p-4 sm:p-5">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {session.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground',
              )}
            >
              {message.content}
              {message.role === 'assistant' && message.source ? (
                <p className="mt-2 text-[11px] uppercase tracking-wider opacity-70">
                  {message.source === 'llm' ? 'AI' : 'Template'}
                </p>
              ) : null}
            </div>
          ))}
          {pending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              Coach is thinking…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Ask about skills, roadmap, salary, or promotion…"
            disabled={pending}
            className="min-h-[2.75rem] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={pending || !draft.trim()} className="sm:self-end">
            {pending ? <Spinner size="sm" /> : null}
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
