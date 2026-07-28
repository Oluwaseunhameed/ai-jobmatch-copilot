import Link from 'next/link';
import { listAdminCompanies } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';

export default async function AdminCompaniesPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const companies = await listAdminCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Company directory with active vs total job counts.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Company</th>
              <th className="px-3 py-2.5 font-medium">Industry</th>
              <th className="px-3 py-2.5 font-medium">Location</th>
              <th className="px-3 py-2.5 font-medium">Jobs</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/companies/${company.slug}`} className="font-medium hover:underline">
                    {company.name}
                  </Link>
                  {company.websiteUrl ? (
                    <div className="truncate text-xs text-muted-foreground">{company.websiteUrl}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{company.industry ?? '—'}</td>
                <td className="px-3 py-3 text-muted-foreground">{company.location ?? '—'}</td>
                <td className="px-3 py-3">
                  {company.activeJobs}
                  <span className="text-muted-foreground"> / {company.totalJobs}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {companies.length === 0 && (
        <p className="text-sm text-muted-foreground">No companies yet.</p>
      )}
    </div>
  );
}
