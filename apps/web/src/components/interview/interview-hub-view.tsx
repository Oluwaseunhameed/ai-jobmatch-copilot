'use client';

import Link from 'next/link';
import { MessageSquareQuote } from 'lucide-react';

import type { InterviewPrep } from '@/lib/api-client';

export function InterviewHubView({ preps }: { preps: InterviewPrep[] }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Interview preparation
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Practice for the roles you care about
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Generate a prep pack from any job posting, rehearse with tips, and track a confidence score.
          Practice with mock feedback and browser voice input; this pack covers behavioral through
          DevOps categories. TTS playback remains deferred.
        </p>
      </div>

      {preps.length === 0 ? (
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-primary" />
            <p className="font-medium text-foreground">No sessions yet</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a job and click <span className="font-medium text-foreground">Generate prep pack</span>{' '}
            in the sidebar.
          </p>
          <Link href="/jobs" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {preps.map((prep) => (
            <li key={prep.id}>
              <Link
                href={`/interview/${prep.id}`}
                className="surface-panel block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {prep.job?.companyName ?? 'Company'}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {prep.job?.title ?? 'Interview prep'}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {prep.questions.length} questions · {prep.status}
                      {typeof prep.confidenceScore === 'number'
                        ? ` · ${prep.confidenceScore}% confidence`
                        : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">Practice →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
