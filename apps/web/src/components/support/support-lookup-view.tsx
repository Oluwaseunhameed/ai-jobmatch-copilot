'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { supportLookupUser, type SupportUserLookup } from '@/lib/api-client';

export function SupportLookupView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SupportUserLookup | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setUser(null);
    try {
      const result = await supportLookupUser(email.trim());
      setUser(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">User lookup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search by email for plan, onboarding, and engagement snapshot.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lookup-email">Email</Label>
          <Input
            id="lookup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <Button size="sm" disabled={loading || !email.trim()} onClick={() => void lookup()}>
          {loading ? <Spinner size="sm" /> : 'Look up'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {user && (
        <section className="surface-panel space-y-3 p-5 sm:p-6 text-sm">
          <p className="font-display text-lg font-semibold">{user.name}</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd>
                {user.planId}
                {user.subscriptionStatus ? ` (${user.subscriptionStatus})` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Onboarding</dt>
              <dd>{user.onboardingCompleted ? 'Complete' : 'Incomplete'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Profile</dt>
              <dd>
                {user.headline ?? '—'} · {user.completenessScore ?? 0}% complete
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Activity</dt>
              <dd>
                {user.applicationCount} applications · {user.resumeCount} resumes
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
