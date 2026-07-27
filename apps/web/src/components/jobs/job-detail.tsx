'use client';

import Link from 'next/link';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, MapPin } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ApplicationAssistantPanel } from '@/components/jobs/application-assistant-panel';
import { JobInsightsPanel } from '@/components/jobs/job-insights-panel';
import { TrackApplicationPanel } from '@/components/jobs/track-application-panel';
import { ResumeOptimizePanel } from '@/components/resumes/resume-optimize-panel';
import { formatPostedAt, formatSalary, saveJob, unsaveJob, type Job } from '@/lib/api-client';

export function JobDetail({ job: initial }: { job: Job }) {
  const [job, setJob] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const salary = formatSalary(job);

  async function toggleSave() {
    setPending(true);
    setError(null);
    try {
      if (job.isSaved) {
        await unsaveJob(job.slug);
        setJob((current) => ({ ...current, isSaved: false }));
      } else {
        await saveJob(job.slug);
        setJob((current) => ({ ...current, isSaved: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved jobs');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              href={`/companies/${job.company.slug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {job.company.name}
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              )}
              <span className="capitalize">{job.workMode.replace('-', ' ')}</span>
              <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
              <span className="capitalize">{job.seniority}</span>
              {salary && <span>{salary}</span>}
              <span>Posted {formatPostedAt(job.postedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending} onClick={() => void toggleSave()}>
              {pending ? (
                <Spinner size="sm" />
              ) : job.isSaved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {job.isSaved ? 'Saved' : 'Save'}
            </Button>
            {job.applyUrl && (
              <Button asChild>
                <a href={job.applyUrl} target="_blank" rel="noreferrer">
                  Apply
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Section title="About the role">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          </Section>

          {job.responsibilities.length > 0 && (
            <Section title="Responsibilities">
              <BulletList items={job.responsibilities} />
            </Section>
          )}

          {job.requirements.length > 0 && (
            <Section title="Requirements">
              <BulletList items={job.requirements} />
            </Section>
          )}

          {job.benefits.length > 0 && (
            <Section title="Benefits">
              <BulletList items={job.benefits} />
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          <TrackApplicationPanel jobId={job.id} />
          <ResumeOptimizePanel jobId={job.id} />
          <ApplicationAssistantPanel jobId={job.id} />

          <JobInsightsPanel slug={job.slug} />

          <div className="surface-panel p-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {job.company.name}
            </h2>
            {job.company.industry && (
              <p className="mt-1 text-sm text-muted-foreground">{job.company.industry}</p>
            )}
            {job.company.about && (
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                {job.company.about}
              </p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              {job.company.size && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{job.company.size}</dd>
                </div>
              )}
              {job.company.location && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">HQ</dt>
                  <dd className="text-right">{job.company.location}</dd>
                </div>
              )}
            </dl>
            <Link
              href={`/companies/${job.company.slug}`}
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              View company intelligence →
            </Link>
          </div>

          {job.skills.length > 0 && (
            <div className="surface-panel p-5">
              <h2 className="font-display text-lg font-semibold tracking-tight">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.skills.map((skill) => {
                  const matched = job.matchedSkills?.includes(skill);
                  const missing = job.missingSkills?.includes(skill);
                  return (
                    <span
                      key={skill}
                      className={
                        matched
                          ? 'rounded-md bg-primary/10 px-2 py-0.5 text-xs text-foreground'
                          : missing
                            ? 'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                            : 'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-panel p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
