'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';

import { formatPostedAt, formatSalary, type CompanyProfile } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function fitTone(level: CompanyProfile['cultureSignals'][0]['level']) {
  if (level === 'strong') return 'text-success';
  if (level === 'partial') return 'text-warning';
  if (level === 'gap') return 'text-destructive';
  return 'text-muted-foreground';
}

function matchTone(score: number) {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-muted-foreground';
}

function velocityLabel(velocity: CompanyProfile['hiring']['velocity']) {
  if (velocity === 'accelerating') return 'Accelerating';
  if (velocity === 'steady') return 'Steady';
  if (velocity === 'slow') return 'Slow';
  return 'Unknown';
}

function formatSalaryBand(band: CompanyProfile['salaryEstimates'][0]) {
  const currency = band.currency || 'USD';
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const period =
    band.period === 'year'
      ? 'yr'
      : band.period === 'month'
        ? 'mo'
        : band.period === 'hour'
          ? 'hr'
          : band.period;

  if (band.min != null && band.max != null) {
    return `${format(band.min)}–${format(band.max)}/${period}`;
  }
  if (band.median != null) {
    return `~${format(band.median)}/${period} median`;
  }
  return null;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

export function CompanyProfileView({ profile }: { profile: CompanyProfile }) {
  const { company } = profile;

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
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {company.name}
                </h1>
                {company.industry && (
                  <p className="text-sm text-muted-foreground">{company.industry}</p>
                )}
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {profile.summary}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {company.size && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {company.size} employees
                </span>
              )}
              {company.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  HQ · {company.location}
                </span>
              )}
              {company.websiteUrl && (
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <Link
                href="/network"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Plan outreach
              </Link>
            </div>
          </div>
        </div>
      </div>

      {profile.viewer && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Your avg match" value={profile.viewer.avgMatchScore != null ? `${profile.viewer.avgMatchScore}%` : '—'} />
          <StatCard label="Saved roles" value={String(profile.viewer.savedRoles)} />
          <StatCard label="Applications" value={String(profile.viewer.applications)} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open roles" value={String(profile.hiring.openRoles)} />
        <StatCard label="Posted (30d)" value={String(profile.hiring.postedLast30Days)} />
        <StatCard label="Posted (90d)" value={String(profile.hiring.postedLast90Days)} />
        <StatCard
          label="Hiring velocity"
          value={velocityLabel(profile.hiring.velocity)}
          icon={<TrendingUp className="h-4 w-4 text-primary/70" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Section title="Open positions">
            {profile.openRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active roles right now.</p>
            ) : (
              <ul className="divide-y divide-border">
                {profile.openRoles.map((role) => {
                  const salary = formatSalary(role);
                  return (
                    <li key={role.id}>
                      <Link
                        href={`/jobs/${role.slug}`}
                        className="flex flex-col gap-2 py-4 transition-colors hover:text-primary sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{role.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPostedAt(role.postedAt)}
                            {role.location ? ` · ${role.location}` : ''}
                            {` · ${capitalize(role.workMode)} · ${capitalize(role.seniority)}`}
                            {salary ? ` · ${salary}` : ''}
                          </p>
                        </div>
                        {typeof role.matchScore === 'number' && (
                          <span className={cn('text-sm tabular-nums', matchTone(role.matchScore))}>
                            {role.matchScore}% match
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {company.about && (
            <Section title="About">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {company.about}
              </p>
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          {profile.cultureSignals.length > 0 && (
            <Panel title="Culture signals">
              <ul className="space-y-3">
                {profile.cultureSignals.map((signal) => (
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
            </Panel>
          )}

          {profile.techStack.length > 0 && (
            <Panel title="Tech stack">
              <div className="flex flex-wrap gap-1.5">
                {profile.techStack.map((item) => (
                  <span
                    key={item.skill}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                    title={`${item.count} role${item.count === 1 ? '' : 's'}`}
                  >
                    {item.skill}
                    <span className="ml-1 text-muted-foreground">×{item.count}</span>
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {profile.salaryEstimates.length > 0 && (
            <Panel title="Salary estimates">
              <ul className="space-y-2 text-sm">
                {profile.salaryEstimates.map((band) => {
                  const label = formatSalaryBand(band);
                  return (
                    <li key={`${band.currency}-${band.period}`} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        {band.currency}/{band.period}
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {label ?? '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Derived from active listings; not employer-reported compensation data.
              </p>
            </Panel>
          )}

          {profile.benefits.length > 0 && (
            <Panel title="Benefits themes">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {profile.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {profile.locations.length > 0 && (
            <Panel title="Locations">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {profile.locations.map((location) => (
                  <li key={location}>{location}</li>
                ))}
              </ul>
            </Panel>
          )}

          {(profile.workModeMix.length > 0 || profile.seniorityMix.length > 0) && (
            <Panel title="Hiring mix">
              {profile.workModeMix.length > 0 && (
                <MixList label="Work mode" items={profile.workModeMix} />
              )}
              {profile.seniorityMix.length > 0 && (
                <MixList label="Seniority" items={profile.seniorityMix} className="mt-4" />
              )}
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
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-panel p-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MixList({
  label,
  items,
  className,
}: {
  label: string;
  items: Array<{ value: string; count: number }>;
  className?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.value} className="flex justify-between gap-4">
            <span className="capitalize text-muted-foreground">{item.value.replace(/-/g, ' ')}</span>
            <span className="tabular-nums text-foreground">
              {item.count}
              {total > 0 ? ` (${Math.round((item.count / total) * 100)}%)` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
