import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { requireAppUser } from '@/lib/auth';
import { prisma } from '@jobmatch/database';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const app = await requireAppUser();
  const name = app?.user.name ?? 'there';

  const profile = app
    ? await prisma.careerProfile.findUnique({
        where: { userId: app.user.id },
        include: { skills: true },
      })
    : null;

  const resumeCount = app ? await prisma.resume.count({ where: { userId: app.user.id } }) : 0;

  const primaryResume = app
    ? await prisma.resume.findFirst({
        where: { userId: app.user.id, isPrimary: true },
      })
    : null;

  const savedJobs = app
    ? await prisma.jobInteraction.count({ where: { userId: app.user.id, type: 'saved' } })
    : 0;

  const openJobs = await prisma.job.count({ where: { isActive: true } });

  const score = profile?.completenessScore ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {name}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Your AI job search workspace. Keep your profile and resumes current — matching builds on
          both.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-panel p-5 sm:p-6">
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
                {score === 0 ? 'Start profile' : 'Improve'}
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
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {score >= 80
              ? 'Strong foundation — matching and resume tools will work best.'
              : 'Add headline, summary, desired roles, links, and at least three skills.'}
          </p>
          {profile?.headline && (
            <p className="mt-3 text-sm font-medium text-foreground">{profile.headline}</p>
          )}
        </div>

        <div className="surface-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Resume library</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {resumeCount === 0
                  ? 'Upload PDF or DOCX resumes to unlock parsing and tailoring.'
                  : `${resumeCount} resume${resumeCount === 1 ? '' : 's'} on file${
                      primaryResume ? ` · primary: ${primaryResume.title}` : ''
                    }.`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/resumes">
                {resumeCount === 0 ? 'Upload' : 'Manage'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-primary/80">
            Module 3
          </p>
        </div>

        <div className="surface-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Open roles</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {openJobs === 0
                  ? 'Seed jobs to start discovering matches.'
                  : `${openJobs} active posting${openJobs === 1 ? '' : 's'}${
                      savedJobs ? ` · ${savedJobs} saved` : ''
                    }.`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/jobs">
                Browse
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-primary/80">
            Module 5
          </p>
        </div>

        <Panel
          title="Job pipeline"
          body="Track applications from saved to offer in one calm board."
          hint="Coming soon"
        />
      </div>
    </div>
  );
}

function Panel({ title, body, hint }: { title: string; body: string; hint: string }) {
  return (
    <div className="surface-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-primary/80">{hint}</p>
    </div>
  );
}
