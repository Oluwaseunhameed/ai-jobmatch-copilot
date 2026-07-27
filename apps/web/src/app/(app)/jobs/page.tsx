import { JobBrowser } from '@/components/jobs/job-browser';
import { TrendingJobsPanel } from '@/components/jobs/trending-jobs-panel';

export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Job discovery</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Find roles that fit how you work
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Search by keyword or meaning, save filters as alerts, and keep an eye on roles gaining
          traction.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Trending now</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Roles with the most saves and views over the last two weeks.
          </p>
        </div>
        <TrendingJobsPanel limit={6} />
      </section>

      <JobBrowser />
    </div>
  );
}
