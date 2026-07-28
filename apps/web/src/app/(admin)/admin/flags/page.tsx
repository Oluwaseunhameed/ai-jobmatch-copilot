import { listAdminFeatureFlags } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { AdminFlagsPanel } from '@/components/admin/admin-flags-panel';
import { requireAdmin } from '@/lib/auth';

export default async function AdminFlagsPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const flags = await listAdminFeatureFlags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Feature flags</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Lightweight Postgres-backed toggles. Product code can read these later; LaunchDarkly-scale
          experimentation stays deferred.
        </p>
      </div>
      <AdminFlagsPanel flags={flags} />
    </div>
  );
}
