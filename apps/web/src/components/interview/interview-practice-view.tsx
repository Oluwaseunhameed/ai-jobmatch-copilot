'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  INTERVIEW_CATEGORY_LABELS,
  runInterviewMockTurn,
  updateInterviewPractice,
  type InterviewPrep,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

function categoryLabel(category: string) {
  return (
    INTERVIEW_CATEGORY_LABELS[category as keyof typeof INTERVIEW_CATEGORY_LABELS] ?? category
  );
}

export function InterviewPracticeView({ prep: initial }: { prep: InterviewPrep }) {
  const [prep, setPrep] = useState(initial);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ratings = useMemo(() => {
    const map = new Map(prep.practice.map((p) => [p.questionId, p.selfRating]));
    return map;
  }, [prep.practice]);

  const practiceById = useMemo(() => {
    return new Map(prep.practice.map((p) => [p.questionId, p]));
  }, [prep.practice]);

  const questions =
    activeCategory === 'all'
      ? prep.questions
      : prep.questions.filter((q) => q.category === activeCategory);

  async function rate(questionId: string, selfRating: number) {
    if (pendingQuestionId) return;
    setPendingQuestionId(questionId);
    setError(null);
    const prior = practiceById.get(questionId);
    const nextPractice = [
      ...prep.practice.filter((p) => p.questionId !== questionId),
      {
        questionId,
        selfRating,
        notes: prior?.notes ?? null,
        answer: prior?.answer ?? null,
        feedback: prior?.feedback ?? null,
        followUp: prior?.followUp ?? null,
        feedbackSource: prior?.feedbackSource ?? null,
      },
    ];
    try {
      const updated = await updateInterviewPractice(prep.id, nextPractice);
      setPrep(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rating');
    } finally {
      setPendingQuestionId(null);
    }
  }

  async function submitMock(questionId: string) {
    if (pendingQuestionId) return;
    const answer = (answers[questionId] ?? practiceById.get(questionId)?.answer ?? '').trim();
    if (!answer) {
      setError('Write an answer before running mock feedback');
      return;
    }
    setPendingQuestionId(questionId);
    setError(null);
    try {
      const updated = await runInterviewMockTurn(prep.id, {
        questionId,
        answer,
        selfRating: ratings.get(questionId) ?? 3,
      });
      setPrep(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock turn failed');
    } finally {
      setPendingQuestionId(null);
    }
  }

  function startVoice(questionId: string) {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (
            window as unknown as {
              SpeechRecognition?: new () => {
                continuous: boolean;
                interimResults: boolean;
                onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                onerror: (() => void) | null;
                start: () => void;
              };
              webkitSpeechRecognition?: new () => {
                continuous: boolean;
                interimResults: boolean;
                onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                onerror: (() => void) | null;
                start: () => void;
              };
            }
          ).SpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => {
                continuous: boolean;
                interimResults: boolean;
                onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                onerror: (() => void) | null;
                start: () => void;
              };
            }
          ).webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser — type your answer instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: [prev[questionId], transcript].filter(Boolean).join(' ').trim(),
        }));
      }
    };
    recognition.onerror = () => {
      setError('Voice capture failed — try typing instead.');
    };
    recognition.start();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/interview"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All interview prep
        </Link>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-primary">
            {prep.job ? `${prep.job.companyName} · ` : ''}
            {prep.job?.title ?? 'Interview prep'}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Practice session
          </h1>
          {prep.summary && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{prep.summary}</p>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Questions" value={String(prep.questions.length)} />
          <Stat label="Status" value={prep.status} />
          <Stat
            label="Confidence"
            value={typeof prep.confidenceScore === 'number' ? `${prep.confidenceScore}%` : '—'}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
          All
        </FilterChip>
        {prep.categories.map((category) => (
          <FilterChip
            key={category}
            active={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            {categoryLabel(category)}
          </FilterChip>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {questions.map((question, index) => {
          const rating = ratings.get(question.id);
          return (
            <li key={question.id} className="surface-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>{categoryLabel(question.category)}</span>
                <span aria-hidden>·</span>
                <span className="capitalize">{question.difficulty}</span>
                {rating != null && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check className="h-3 w-3" /> Rated {rating}/5
                    </span>
                  </>
                )}
              </div>
              <p className="mt-3 font-display text-lg font-semibold tracking-tight">
                {index + 1}. {question.prompt}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Tip: </span>
                {question.tip}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Confidence</span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={rating === value ? 'default' : 'outline'}
                    disabled={pendingQuestionId === question.id}
                    onClick={() => void rate(question.id, value)}
                  >
                    {value}
                  </Button>
                ))}
                {pendingQuestionId === question.id && <Spinner size="sm" />}
              </div>

              <label className="mt-4 block space-y-1 text-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mock answer
                </span>
                <textarea
                  value={answers[question.id] ?? practiceById.get(question.id)?.answer ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Type or dictate your answer…"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingQuestionId === question.id}
                  onClick={() => startVoice(question.id)}
                >
                  Voice input
                </Button>
                <Button
                  size="sm"
                  disabled={pendingQuestionId === question.id}
                  onClick={() => void submitMock(question.id)}
                >
                  Get mock feedback
                </Button>
              </div>
              {practiceById.get(question.id)?.feedback ? (
                <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Feedback
                    {practiceById.get(question.id)?.feedbackSource
                      ? ` · ${practiceById.get(question.id)?.feedbackSource}`
                      : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {practiceById.get(question.id)?.feedback}
                  </p>
                  {practiceById.get(question.id)?.followUp ? (
                    <p className="mt-2 text-foreground">
                      {practiceById.get(question.id)?.followUp}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {prep.job && (
        <p className="text-sm text-muted-foreground">
          Back to{' '}
          <Link href={`/jobs/${prep.job.slug}`} className="font-medium text-foreground hover:underline">
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
