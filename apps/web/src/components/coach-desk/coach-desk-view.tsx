'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  assignCoachMember,
  listCoachDeskMembers,
  type CoachDeskMember,
} from '@/lib/api-client';

export function CoachDeskView() {
  const [members, setMembers] = useState<CoachDeskMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listCoachDeskMembers();
      setMembers(data.members);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load coach desk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const assign = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await assignCoachMember(email.trim(), note.trim() || undefined);
      setEmail('');
      setNote('');
      setMessage('Member assigned.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign member');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Assign member</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Link a user by email to your coach desk. They must already have an account.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="member-email">Member email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-note">Note (optional)</Label>
            <Input
              id="member-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cohort, focus area…"
            />
          </div>
        </div>
        <Button size="sm" disabled={pending || !email.trim()} onClick={() => void assign()}>
          {pending ? <Spinner size="sm" /> : 'Assign member'}
        </Button>
        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Your members</h2>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            Loading…
          </div>
        ) : members.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No assigned members yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/80">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                  {m.headline && (
                    <p className="mt-1 text-sm text-muted-foreground">{m.headline}</p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{m.applicationCount} applications</p>
                  <p>
                    Profile {m.completenessScore ?? 0}% · {m.source}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
