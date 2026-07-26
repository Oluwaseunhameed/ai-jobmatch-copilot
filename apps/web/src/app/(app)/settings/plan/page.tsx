import Link from 'next/link';

import { SettingsNav } from '@/components/settings/settings-nav';
import {
  FREE_PLAN_ID,
  PLAN_LABELS,
  freePlanFeatures,
  proPlanTeasers,
} from '@/lib/plan';

export default function PlanSettingsPage() {
  const features = freePlanFeatures();
  const teasers = proPlanTeasers();

  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Plan</h2>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        You are on the Free plan for the MVP. Billing and Pro upgrades ship later — no payment is
        required today.
      </p>

      <div className="max-w-xl space-y-4">
        <section className="surface-panel p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Current plan
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {PLAN_LABELS[FREE_PLAN_ID]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Included with every account.</p>

          <ul className="mt-5 space-y-2.5">
            {features.map((feature) => (
              <li key={feature.key} className="flex gap-2 text-sm leading-relaxed text-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Coming with Pro
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Phase 2 adds paid upgrades. These capabilities are listed so you know what is next —
            there is no checkout yet.
          </p>
          <ul className="mt-4 space-y-2.5">
            {teasers.map((feature) => (
              <li key={feature.key} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-muted-foreground">
          Questions about limits? Start from your{' '}
          <Link href="/dashboard" className="font-medium text-foreground underline-offset-4 hover:underline">
            dashboard
          </Link>{' '}
          activity and profile completeness.
        </p>
      </div>
    </div>
  );
}
