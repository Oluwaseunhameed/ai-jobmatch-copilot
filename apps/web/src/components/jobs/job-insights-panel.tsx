'use client';

import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { getJobInsights, type JobInsights } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function fitTone(level: JobInsights['fitSignals'][0]['level']) {
  if (level === 'strong') return 'text-success';
  if (level === 'partial') return 'text-warning';
  if (level === 'gap') return 'text-destructive';
  return 'text-muted-foreground';
}

function priorityLabel(priority: JobInsights['skillGaps'][0]['priority']) {
  if (priority === 'high') return 'High priority';
  if (priority === 'medium') return 'Medium';
  return 'Low';
}

export function JobInsightsPanel({ slug }: { slug: string }) {
  const [insights, setInsights] = useState<JobInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getJobInsights(slug)
      .then(setInsights)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load insights');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="surface-panel flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Spinner size="sm" />
        Analysing fit…
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="surface-panel p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">Job insights</h2>
        <p className="mt-2 text-sm text-destructive">{error ?? 'Insights unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-panel p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">Job insights</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insights.summary}</p>

        {typeof insights.matchScore === 'number' ? (
          <>
            <p className="mt-4 font-display text-4xl font-semibold tracking-tight tabular-nums">
              {insights.matchScore}
              <span className="ml-1 text-lg font-medium text-muted-foreground">%</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Skill coverage vs your profile</p>

            {insights.matchedSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  You have
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {insights.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Add skills on your{' '}
            <Link href="/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
              career profile
            </Link>{' '}
            to unlock match scoring.
          </p>
        )}
      </div>

      {insights.fitSignals.length > 0 && (
        <div className="surface-panel p-5">
          <h3 className="font-display text-base font-semibold tracking-tight">Fit signals</h3>
          <ul className="mt-3 space-y-3">
            {insights.fitSignals.map((signal) => (
              <li key={signal.key} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{signal.label}</span>
                  <span className={cn('text-xs capitalize', fitTone(signal.level))}>
                    {signal.level}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{signal.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.skillGaps.length > 0 && (
        <div className="surface-panel p-5">
          <h3 className="font-display text-base font-semibold tracking-tight">Skill gaps</h3>
          <ul className="mt-3 space-y-3">
            {insights.skillGaps.map((gap) => (
              <li key={gap.skill} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{gap.skill}</span>
                  <span className="text-xs text-muted-foreground">{priorityLabel(gap.priority)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{gap.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.learningRecommendations.length > 0 && (
        <div className="surface-panel p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold tracking-tight">
              Learning recommendations
            </h3>
          </div>
          <ul className="mt-3 space-y-3">
            {insights.learningRecommendations.map((rec, index) => (
              <li key={`${rec.skill}-${rec.url}-${index}`} className="text-sm">
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-1.5 font-medium text-foreground hover:text-primary"
                >
                  {rec.title}
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="mt-1 text-muted-foreground">
                  {rec.skill} · {rec.provider}
                  {rec.estimatedHours ? ` · ~${rec.estimatedHours}h` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
