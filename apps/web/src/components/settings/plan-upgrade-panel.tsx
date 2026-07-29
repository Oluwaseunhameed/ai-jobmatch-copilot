'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  PRO_PLAN_LIMITS,
  TEAM_PLAN_LIMITS,
  freePlanFeatures,
  proPlanFeatures,
  teamPlanFeatures,
  type PlanId,
} from '@/lib/plan-features';
import type { BillingProvider } from '@jobmatch/types';

type BillingStatus = {
  planId: PlanId;
  subscription: {
    status: string;
    provider: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  country: string | null;
  suggestedProvider: BillingProvider;
  providers: { lemon_squeezy: boolean; paystack: boolean };
};

export function PlanUpgradePanel() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BillingProvider>('lemon_squeezy');

  useEffect(() => {
    void fetch('/api/billing/checkout', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load billing status');
        return res.json() as Promise<BillingStatus>;
      })
      .then((data) => {
        setStatus(data);
        setProvider(data.suggestedProvider);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load plan');
      })
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout() {
    setCheckoutPending(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const body = (await res.json().catch(() => null)) as {
        url?: string;
        error?: { message?: string };
      } | null;
      if (!res.ok || !body?.url) {
        throw new Error(body?.error?.message || 'Checkout unavailable');
      }
      window.location.href = body.url;
    } catch (err) {
      setCheckoutPending(false);
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" />
        Loading plan…
      </div>
    );
  }

  const planId = status?.planId ?? 'free';
  const freeFeatures = freePlanFeatures();
  const proFeatures = proPlanFeatures();
  const teamFeatures = teamPlanFeatures();
  const isPro = planId === 'pro';
  const isTeam = planId === 'team';
  const isPaid = isPro || isTeam;

  return (
    <div className="max-w-xl space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="surface-panel p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Current plan
        </p>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {PLAN_LABELS[planId]}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isTeam
            ? `Team plan includes up to ${TEAM_PLAN_LIMITS.maxTeamSeats} seats for coaches and members. Contact sales for billing changes.`
            : isPro
              ? status?.subscription?.provider === 'paystack'
                ? 'Billed via Paystack (NGN).'
                : status?.subscription?.provider === 'lemon_squeezy'
                  ? 'Billed via Lemon Squeezy.'
                  : 'Pro is active on your account.'
              : 'Included with every account. Upgrade when you need higher limits.'}
        </p>
        {status?.subscription?.currentPeriodEnd && (
          <p className="mt-2 text-xs text-muted-foreground">
            Period ends {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
            {status.subscription.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
          </p>
        )}

        <ul className="mt-5 space-y-2.5">
          {(isTeam ? teamFeatures : isPro ? proFeatures : freeFeatures).map((feature) => (
            <li key={feature.key} className="flex gap-2 text-sm leading-relaxed text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {!isPaid && (
        <section className="surface-panel p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Upgrade to Pro
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nigerian accounts use Paystack (NGN). Everyone else checks out with Lemon Squeezy
            (global cards / subscriptions).
          </p>

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="provider"
                checked={provider === 'lemon_squeezy'}
                onChange={() => setProvider('lemon_squeezy')}
              />
              Lemon Squeezy — global
              {!status?.providers.lemon_squeezy && (
                <span className="text-xs text-muted-foreground">(env not set)</span>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="provider"
                checked={provider === 'paystack'}
                onChange={() => setProvider('paystack')}
              />
              Paystack — Nigeria (NGN)
              {!status?.providers.paystack && (
                <span className="text-xs text-muted-foreground">(env not set)</span>
              )}
            </label>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Checkout starts a Pro subscription by default. One-time purchases use the same
            providers when a one-time product / amount is configured in env.
          </p>

          {!status?.country && (
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: set your country on{' '}
              <Link href="/profile" className="underline underline-offset-2">
                Profile
              </Link>{' '}
              so we can suggest the right checkout.
            </p>
          )}

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              Resumes {FREE_PLAN_LIMITS.maxResumes} → {PRO_PLAN_LIMITS.maxResumes}
            </li>
            <li>
              Saved jobs {FREE_PLAN_LIMITS.maxSavedJobs} → {PRO_PLAN_LIMITS.maxSavedJobs}
            </li>
            <li>
              Optimisations / month {FREE_PLAN_LIMITS.aiOptimizePerMonth} →{' '}
              {PRO_PLAN_LIMITS.aiOptimizePerMonth}
            </li>
            <li>
              Cover letters / month {FREE_PLAN_LIMITS.aiCoverLettersPerMonth} →{' '}
              {PRO_PLAN_LIMITS.aiCoverLettersPerMonth}
            </li>
          </ul>

          <Button
            className="mt-5"
            size="sm"
            disabled={checkoutPending}
            onClick={() => void startCheckout()}
          >
            {checkoutPending ? <Spinner size="sm" /> : null}
            {checkoutPending ? 'Redirecting…' : 'Upgrade to Pro'}
          </Button>
        </section>
      )}
    </div>
  );
}
