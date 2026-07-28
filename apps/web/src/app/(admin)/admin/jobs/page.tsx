import Link from 'next/link';
import { listAdminJobs } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';

export default async function AdminJobsPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const jobs = await listAdminJobs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Catalog snapshot (up to {jobs.length} most recent / active).
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Company</th>
              <th className="px-3 py-2.5 font-medium">Mode</th>
              <th className="px-3 py-2.5 font-medium">Source</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/jobs/${job.slug}`} className="font-medium hover:underline">
                    {job.title}
                  </Link>
                  {job.seniority ? (
                    <div className="text-xs capitalize text-muted-foreground">{job.seniority}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/companies/${job.companySlug}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {job.companyName}
                  </Link>
                </td>
                <td className="px-3 py-3 capitalize">{job.workMode}</td>
                <td className="px-3 py-3 text-muted-foreground">{job.source ?? '—'}</td>
                <td className="px-3 py-3">{job.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs in catalog.</p>}
    </div>
  );
}
