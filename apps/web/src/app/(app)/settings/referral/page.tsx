'use client';

import { useEffect, useState } from 'react';

import { SettingsNav } from '@/components/settings/settings-nav';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getReferralSummary, type ReferralSummary } from '@/lib/api-client';

export default function ReferralSettingsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getReferralSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shareUrl =
    typeof window !== 'undefined' && summary
      ? `${window.location.origin}${summary.sharePath}`
      : summary?.sharePath ?? '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Referral</h2>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Share your link. When someone completes onboarding, you receive {summary?.rewardDays ?? 30}{' '}
        days of Pro.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : summary ? (
        <section className="surface-panel max-w-xl space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your code
            </p>
            <p className="mt-1 font-mono text-lg">{summary.code}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Share link
            </p>
            <p className="mt-1 break-all text-sm">{shareUrl}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Signups</dt>
              <dd className="font-medium">{summary.redemptionCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rewards granted</dt>
              <dd className="font-medium">{summary.rewardedCount}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
