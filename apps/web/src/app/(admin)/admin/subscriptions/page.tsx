import { listAdminSubscriptions } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/auth';

export default async function AdminSubscriptionsPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const subscriptions = await listAdminSubscriptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Billing rows mirrored from Lemon Squeezy / Paystack webhooks.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">User</th>
              <th className="px-3 py-2.5 font-medium">Plan</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Provider</th>
              <th className="px-3 py-2.5 font-medium">Period end</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium">{sub.userName}</div>
                  <div className="text-xs text-muted-foreground">{sub.userEmail}</div>
                </td>
                <td className="px-3 py-3 capitalize">{sub.planId}</td>
                <td className="px-3 py-3">
                  {sub.status}
                  {sub.cancelAtPeriodEnd ? (
                    <span className="ml-1 text-xs text-muted-foreground">(cancels)</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{sub.provider ?? '—'}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {sub.currentPeriodEnd
                    ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {subscriptions.length === 0 && (
        <p className="text-sm text-muted-foreground">No subscription rows yet.</p>
      )}
    </div>
  );
}
