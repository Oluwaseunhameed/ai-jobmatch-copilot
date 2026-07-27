'use client';

import Link from 'next/link';
import {
  Award,
  BookOpen,
  ExternalLink,
  Route,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import type { CareerGrowthHub } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function fitTone(level: CareerGrowthHub['promotionReadiness']['level']) {
  if (level === 'strong') return 'text-success';
  if (level === 'partial') return 'text-warning';
  if (level === 'gap') return 'text-destructive';
  return 'text-muted-foreground';
}

function priorityLabel(priority: CareerGrowthHub['skillGaps'][0]['priority']) {
  if (priority === 'high') return 'High priority';
  if (priority === 'medium') return 'Medium';
  return 'Low';
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

export function CareerGrowthView({ hub }: { hub: CareerGrowthHub }) {
  const salary = hub.salaryGrowth;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Career Growth Hub
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Your growth plan
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{hub.summary}</p>
        <p className="text-xs text-muted-foreground">
          Based on {hub.market.activeJobs} active roles · {hub.market.skillsAnalyzed} skills analysed
          · Update your{' '}
          <Link href="/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
            career profile
          </Link>{' '}
          to refine this ·{' '}
          <Link href="/coach" className="font-medium text-foreground underline-offset-4 hover:underline">
            Ask the career coach
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Promotion readiness"
          value={`${hub.promotionReadiness.score}%`}
          detail={`Toward ${capitalize(hub.promotionReadiness.targetSeniority)}`}
        />
        <StatCard
          label="Skill gaps"
          value={String(hub.skillGaps.length)}
          detail={`${hub.skillGaps.filter((g) => g.priority === 'high').length} high priority`}
        />
        <StatCard
          label="Roadmap steps"
          value={String(hub.roadmap.length)}
          detail={
            hub.roadmap.reduce((sum, step) => sum + (step.estimatedHours ?? 0), 0)
              ? `~${hub.roadmap.reduce((sum, step) => sum + (step.estimatedHours ?? 0), 0)}h estimated`
              : 'Curated learning path'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Section title="Learning roadmap" icon={<Route className="h-4 w-4 text-primary" />}>
            {hub.roadmap.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No high-priority gaps right now — keep applying and deepen impact stories.
              </p>
            ) : (
              <ol className="space-y-5">
                {hub.roadmap.map((step) => (
                  <li key={`${step.order}-${step.skill}`} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                      {step.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      {step.estimatedHours != null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ~{step.estimatedHours}h guided study
                        </p>
                      )}
                      <ul className="mt-3 space-y-2">
                        {step.resources.map((rec, index) => (
                          <li key={`${rec.url}-${index}`}>
                            <a
                              href={rec.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-start gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                            >
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              {rec.title}
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                            </a>
                            <p className="ml-5 text-xs text-muted-foreground">
                              {rec.provider}
                              {rec.estimatedHours ? ` · ~${rec.estimatedHours}h` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Skill gap analysis">
            {hub.skillGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your profile covers the skills most requested in the catalog.
              </p>
            ) : (
              <ul className="space-y-3">
                {hub.skillGaps.map((gap) => (
                  <li key={gap.skill} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{gap.skill}</span>
                      <span className="text-xs text-muted-foreground">{priorityLabel(gap.priority)}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{gap.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Career path suggestions" icon={<Sparkles className="h-4 w-4 text-primary" />}>
            <ul className="space-y-4">
              {hub.careerPaths.map((path) => (
                <li key={path.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">{path.title}</p>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {path.readinessPct}% ready
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {capitalize(path.currentLevel)} → {capitalize(path.nextLevel)}
                  </p>
                  <p className="mt-1 text-muted-foreground">{path.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {path.focusSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="space-y-4">
          <Panel title="Promotion readiness">
            <p className={cn('font-display text-4xl font-semibold tabular-nums', fitTone(hub.promotionReadiness.level))}>
              {hub.promotionReadiness.score}
              <span className="ml-1 text-lg font-medium text-muted-foreground">%</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{hub.promotionReadiness.detail}</p>
            <ul className="mt-4 space-y-3">
              {hub.promotionReadiness.checklist.map((item) => (
                <li key={item.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className={item.done ? 'text-xs text-success' : 'text-xs text-muted-foreground'}>
                      {item.done ? 'Done' : 'Open'}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          </Panel>

          {salary && (
            <Panel title="Salary growth" icon={<TrendingUp className="h-4 w-4 text-primary/70" />}>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Your expectation
                    {salary.profileCurrency ? ` (${salary.profileCurrency})` : ''}
                  </dt>
                  <dd className="font-medium">
                    {salary.expectation != null
                      ? formatMoney(
                          salary.expectation,
                          salary.profileCurrency || salary.currency,
                        )
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Catalog median ({salary.currency})</dt>
                  <dd className="font-medium">
                    {salary.marketMedian != null
                      ? formatMoney(salary.marketMedian, salary.currency)
                      : '—'}
                  </dd>
                </div>
                {salary.marketMin != null && salary.marketMax != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Catalog range</dt>
                    <dd className="text-right">
                      {formatMoney(salary.marketMin, salary.currency)}–
                      {formatMoney(salary.marketMax, salary.currency)}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">{salary.detail}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                From {salary.roleCount} listed roles · not employer-reported market data.
              </p>
            </Panel>
          )}

          <Panel title="Trending technologies">
            <ul className="space-y-2">
              {hub.trendingTechnologies.map((tech) => (
                <li key={tech.skill} className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn(tech.have ? 'text-foreground' : 'text-muted-foreground')}>
                    {tech.skill}
                    {tech.have ? ' ✓' : ''}
                  </span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {tech.demandPct}% · {tech.jobCount}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {hub.certifications.length > 0 && (
            <Panel title="Certification suggestions" icon={<Award className="h-4 w-4 text-primary/70" />}>
              <ul className="space-y-3">
                {hub.certifications.map((cert) => (
                  <li key={cert.name} className="text-sm">
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-1.5 font-medium text-foreground hover:text-primary"
                    >
                      {cert.name}
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </a>
                    <p className="mt-1 text-muted-foreground">
                      {cert.provider} · {cert.skill} · {cert.level}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="surface-panel p-5 sm:p-6">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Panel({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface-panel p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
