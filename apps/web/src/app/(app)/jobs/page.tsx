import { JobBrowser } from '@/components/jobs/job-browser';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Job discovery</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Find roles that fit how you work
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Search by keyword or meaning, then filter by work mode and seniority. Save anything worth
          coming back to.
        </p>
      </div>
      <JobBrowser />
    </div>
  );
}
