import Link from 'next/link';
import { ArrowRight, Bookmark, Eye, KanbanSquare } from 'lucide-react';
import {
  completenessBreakdown,
  prisma,
  type CompletenessProfile,
} from '@jobmatch/database';
import { enrichJobsWithMatch, loadProfileSkillNames } from '@jobmatch/job-search';
import {
  APPLICATION_STAGE_LABELS,
  type ApplicationStage,
} from '@jobmatch/types';

import { Button } from '@/components/ui/button';
import { TrendingJobsPanel } from '@/components/jobs/trending-jobs-panel';
import { requireAppUser } from '@/lib/auth';
import { formatPostedAt } from '@/lib/api-client';
import { getCurrentPlanId, PLAN_LABELS } from '@/lib/plan';
import { cn } from '@/lib/utils';

const GAP_LABELS: Record<string, string> = {
  headline: 'Headline',
  summary: 'Professional summary',
  currentJobTitle: 'Current title',
  yearsOfExperience: 'Years of experience',
  desiredRoles: 'Desired roles',
  employmentType: 'Employment type',
  workLocationPreference: 'Work location preference',
  location: 'City or country',
  phone: 'Phone',
  links: 'Professional link',
  workAuthorization: 'Work authorization',
  skills: 'At least 3 skills',
};

const INTERVIEW_STAGES = new Set<ApplicationStage>([
  'assessment',
  'hr_interview',
  'technical_interview',
  'final_interview',
]);

function formatActivityAt(date: Date | null) {
  if (!date) return null;
  return formatPostedAt(date.toISOString());
}

function countStages(
  rows: { stage: string; _count: { _all: number } }[],
  stages: ApplicationStage[],
) {
  const wanted = new Set(stages);
  return rows.reduce((sum, row) => {
    if (wanted.has(row.stage as ApplicationStage)) return sum + row._count._all;
    return sum;
  }, 0);
}

export default async function DashboardPage() {
  const app = await requireAppUser();
  const name = app?.user.name ?? 'there';
  const userId = app?.user.id;

  const [
    profile,
    resumeCount,
    primaryResume,
    savedCount,
    viewedCount,
    applicationCount,
    applicationsByStage,
    recentApplications,
    recentSavedRows,
    lastInteraction,
    openJobs,
    profileSkills,
    planId,
  ] = await Promise.all([
    userId
      ? prisma.careerProfile.findUnique({
          where: { userId },
          include: { skills: true },
        })
      : Promise.resolve(null),
    userId ? prisma.resume.count({ where: { userId } }) : Promise.resolve(0),
    userId
      ? prisma.resume.findFirst({ where: { userId, isPrimary: true } })
      : Promise.resolve(null),
    userId
      ? prisma.jobInteraction.count({ where: { userId, type: 'saved' } })
      : Promise.resolve(0),
    userId
      ? prisma.jobInteraction.count({ where: { userId, type: 'viewed' } })
      : Promise.resolve(0),
    userId ? prisma.application.count({ where: { userId } }) : Promise.resolve(0),
    userId
      ? prisma.application.groupBy({
          by: ['stage'],
          where: { userId },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.application.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: { job: { include: { company: true } } },
        })
      : Promise.resolve([]),
    userId
      ? prisma.jobInteraction.findMany({
          where: { userId, type: 'saved' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { job: { include: { company: true } } },
        })
      : Promise.resolve([]),
    userId
      ? prisma.jobInteraction.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, type: true },
        })
      : Promise.resolve(null),
    prisma.job.count({ where: { isActive: true } }),
    userId ? loadProfileSkillNames(userId) : Promise.resolve([]),
    userId ? getCurrentPlanId(userId) : Promise.resolve('free' as const),
  ]);

  const preparingCount = countStages(applicationsByStage, ['saved', 'preparing']);
  const appliedCount = countStages(applicationsByStage, ['applied']);
  const interviewCount = countStages(applicationsByStage, [
    'assessment',
    'hr_interview',
    'technical_interview',
    'final_interview',
  ]);
  const offerCount = countStages(applicationsByStage, ['offer']);

  const score = profile?.completenessScore ?? 0;
  const gaps = profile
    ? completenessBreakdown(profile as CompletenessProfile)
        .filter((item) => !item.met)
        .slice(0, 4)
    : completenessBreakdown({} as CompletenessProfile)
        .filter((item) => !item.met)
        .slice(0, 4);

  const recentSaved = enrichJobsWithMatch(
    recentSavedRows.map((row) => ({
      id: row.job.id,
      slug: row.job.slug,
      title: row.job.title,
      skills: row.job.skills,
      companyName: row.job.company.name,
      savedAt: row.createdAt,
    })),
    profileSkills,
  );

  const lastActiveLabel = formatActivityAt(lastInteraction?.createdAt ?? null);

  return (
    <div className="space-y-10 animate-enter">
      <div>
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {name}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          A quiet readout of profile strength, job activity, and your application pipeline.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You’re on{' '}
          <Link
            href="/settings/plan"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {PLAN_LABELS[planId]}
          </Link>
          {planId === 'free'
            ? '. Upgrade for higher AI and storage limits.'
            : '. Higher limits are unlocked on your account.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5 sm:p-6 animate-enter-delayed">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Profile completeness
              </p>
              <p
                className={cn(
                  'mt-2 font-display text-4xl font-semibold tabular-nums',
                  score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-foreground',
                )}
              >
                {score}%
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/profile">
                {score === 0 ? 'Start profile' : score >= 80 ? 'Review' : 'Improve'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>

          {profile?.headline && (
            <p className="mt-4 text-sm font-medium text-foreground">{profile.headline}</p>
          )}

          {gaps.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next to add
              </p>
              <ul className="mt-2 space-y-1.5">
                {gaps.map((gap) => (
                  <li key={gap.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    {GAP_LABELS[gap.key] ?? gap.key}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Profile looks complete — matching will use your skills and preferences.
            </p>
          )}
        </section>

        <section className="surface-panel p-5 sm:p-6 animate-enter-delayed">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activity
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <KanbanSquare className="h-3.5 w-3.5" />
                Pipeline
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {applicationCount}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bookmark className="h-3.5 w-3.5" />
                Saved
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{savedCount}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                Viewed
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{viewedCount}</p>
            </div>
          </div>

          {applicationCount > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <PipelineStat label="Preparing" value={preparingCount} />
              <PipelineStat label="Applied" value={appliedCount} />
              <PipelineStat label="Interview" value={interviewCount} />
              <PipelineStat label="Offer" value={offerCount} />
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {lastActiveLabel
              ? `Last job activity ${lastActiveLabel.toLowerCase()}${
                  lastInteraction?.type === 'saved'
                    ? ' · saved a role'
                    : lastInteraction?.type === 'viewed'
                      ? ' · viewed a role'
                      : ''
                }.`
              : 'Browse jobs to start building your activity trail.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/applications">
                Applications
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/jobs">
                Browse jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/resumes">
                {resumeCount === 0 ? 'Upload resume' : 'Resumes'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {openJobs} open role{openJobs === 1 ? '' : 's'}
            {resumeCount > 0
              ? ` · ${resumeCount} resume${resumeCount === 1 ? '' : 's'}${
                  primaryResume ? ` · primary “${primaryResume.title}”` : ''
                }`
              : ' · no resumes uploaded yet'}
          </p>
        </section>
      </div>

      <section className="animate-enter-delayed">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Trending jobs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Roles gaining traction from saves and views.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/jobs">
              Explore jobs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-4">
          <TrendingJobsPanel limit={3} />
        </div>
      </section>

      <section className="animate-enter-late">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Application pipeline
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recently updated roles in your tracker.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/applications">
              Open tracker
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {recentApplications.length === 0 ? (
          <div className="surface-panel mt-4 px-5 py-10 text-center sm:px-6">
            <p className="font-display text-lg font-semibold tracking-tight">
              No applications yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add a job to your pipeline from the job page to track stages and notes here.
            </p>
            <Button asChild className="mt-5" size="sm">
              <Link href="/jobs">
                Explore jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recentApplications.map((row) => {
              const stage = row.stage as ApplicationStage;
              const label = APPLICATION_STAGE_LABELS[stage] ?? row.stage.replace(/_/g, ' ');
              return (
                <li key={row.id}>
                  <Link
                    href={`/jobs/${row.job.slug}`}
                    className="flex flex-col gap-1 py-4 transition-colors hover:text-primary sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight">{row.job.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {row.job.company.name}
                        <span aria-hidden> · </span>
                        Updated {formatPostedAt(row.updatedAt.toISOString())}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-medium capitalize',
                        INTERVIEW_STAGES.has(stage) || stage === 'offer'
                          ? 'text-success'
                          : 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="animate-enter-late">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Saved roles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent saves with match against your profile skills.
            </p>
          </div>
          {savedCount > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link href="/jobs">
                Find more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {recentSaved.length === 0 ? (
          <div className="surface-panel mt-4 px-5 py-10 text-center sm:px-6">
            <p className="font-display text-lg font-semibold tracking-tight">No saved roles yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Save jobs while browsing to keep a shortlist here — match scores appear once your
              profile has skills.
            </p>
            <Button asChild className="mt-5" size="sm">
              <Link href="/jobs">
                Explore jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recentSaved.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.slug}`}
                  className="flex flex-col gap-1 py-4 transition-colors hover:text-primary sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium tracking-tight">{job.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {job.companyName}
                      <span aria-hidden> · </span>
                      Saved {formatPostedAt(job.savedAt.toISOString())}
                    </p>
                  </div>
                  {typeof job.matchScore === 'number' ? (
                    <span
                      className={cn(
                        'shrink-0 text-sm font-medium tabular-nums',
                        job.matchScore >= 70
                          ? 'text-success'
                          : job.matchScore >= 40
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                    >
                      {job.matchScore}% match
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm text-muted-foreground">Add skills to match</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PipelineStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
