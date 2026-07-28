import Link from 'next/link';
import { getAdminOverview } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card/60 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const overview = await getAdminOverview();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Operations overview for users, catalog, billing, and lightweight feature flags.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Users</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total" value={overview.users.total} />
          <Stat label="Admins" value={overview.users.admins} />
          <Stat label="Onboarded" value={overview.users.onboarded} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Catalog</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Companies" value={overview.catalog.companies} />
          <Stat label="Jobs" value={overview.catalog.jobs} />
          <Stat label="Active jobs" value={overview.catalog.activeJobs} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Billing</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Pro active" value={overview.billing.proActive} />
          <Stat label="Free / inactive" value={overview.billing.free} />
          <Stat label="Past due" value={overview.billing.pastDue} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Engagement
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Applications" value={overview.engagement.applications} />
          <Stat label="Resumes" value={overview.engagement.resumes} />
          <Stat label="Coach sessions" value={overview.engagement.coachSessions} />
          <Stat label="Portfolio projects" value={overview.engagement.portfolioProjects} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Feature flags
          </h2>
          <Link href="/admin/flags" className="text-sm text-primary hover:underline">
            Manage
          </Link>
        </div>
        <ul className="divide-y divide-border/70 rounded-lg border border-border/80">
          {overview.flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{flag.key}</span>
              <span
                className={
                  flag.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                }
              >
                {flag.enabled ? 'On' : 'Off'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
