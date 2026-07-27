'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  COACH_FOCUS_LABELS,
  createCoachSession,
  type CareerCoachSession,
  type CoachFocus,
} from '@/lib/api-client';

const FOCUSES = Object.keys(COACH_FOCUS_LABELS) as CoachFocus[];

const STARTERS: Array<{ focus: CoachFocus; prompt: string }> = [
  { focus: 'skill_gaps', prompt: 'What skill gaps should I close first?' },
  { focus: 'roadmap', prompt: 'What should I study this week?' },
  { focus: 'promotion', prompt: 'Am I ready for a promotion?' },
  { focus: 'salary', prompt: 'How does my salary expectation compare?' },
];

export function CoachHubView({ sessions: initial }: { sessions: CareerCoachSession[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initial);
  const [focus, setFocus] = useState<CoachFocus>('general');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(nextFocus: CoachFocus, message?: string) {
    setPending(true);
    setError(null);
    try {
      const created = await createCoachSession({
        focus: nextFocus,
        message: message ?? null,
      });
      setSessions((current) => [created, ...current]);
      router.push(`/coach/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start coaching');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            AI Career Coach
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Coaching grounded in your Growth Hub
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Ask about skill gaps, roadmaps, salary, and promotion readiness. Answers use your
            Growth Hub snapshot; when the AI service is available, replies can be LLM-polished with
            a deterministic fallback.
          </p>
        </div>
        <Button disabled={pending} onClick={() => void start(focus)}>
          {pending ? <Spinner size="sm" /> : null}
          New session
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FOCUSES.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={focus === value ? 'default' : 'outline'}
            disabled={pending}
            onClick={() => setFocus(value)}
          >
            {COACH_FOCUS_LABELS[value]}
          </Button>
        ))}
      </div>

      <div className="surface-panel p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-medium text-foreground">Quick starts</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((item) => (
            <Button
              key={item.prompt}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void start(item.focus, item.prompt)}
            >
              {item.prompt}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Prefer the analytics view? Open your{' '}
          <Link href="/growth" className="font-medium text-foreground underline-offset-4 hover:underline">
            Growth Hub
          </Link>
          .
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {sessions.length === 0 ? (
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <p className="font-medium text-foreground">No coaching sessions yet</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a focused session above, or ask a quick-start question.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/coach/${session.id}`}
                className="surface-panel block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {COACH_FOCUS_LABELS[session.focus as CoachFocus] ?? session.focus}
                      {session.source === 'llm' ? ' · AI' : ' · template'}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {session.title ?? 'Coaching session'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {session.messages.length} messages · {session.status}
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
