'use client';

import { useEffect, useState } from 'react';

import { SettingsNav } from '@/components/settings/settings-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  addTeamMember,
  createTeam,
  listTeams,
  type Team,
} from '@/lib/api-client';

export default function TeamSettingsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listTeams();
      setTeams(data.teams);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const team = teams[0] ?? null;

  const onCreate = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await createTeam(teamName.trim() || undefined);
      setTeamName('');
      setMessage('Team ready.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create team');
    } finally {
      setPending(false);
    }
  };

  const onAddMember = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await addTeamMember(memberEmail.trim());
      setMemberEmail('');
      setMessage('Member added.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add member');
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Team</h2>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Create a team workspace and invite coaches or members by email.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading…
        </div>
      ) : !team ? (
        <section className="surface-panel max-w-xl space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name (optional)</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Acme Career Coaches"
            />
          </div>
          <Button size="sm" disabled={pending} onClick={() => void onCreate()}>
            {pending ? <Spinner size="sm" /> : 'Create team'}
          </Button>
        </section>
      ) : (
        <div className="max-w-xl space-y-6">
          <section className="surface-panel space-y-3 p-5 sm:p-6">
            <p className="font-display text-xl font-semibold">{team.name}</p>
            <p className="text-sm text-muted-foreground">
              {team.memberCount} / {team.seatLimit} seats used
            </p>
            {team.memberships && team.memberships.length > 0 && (
              <ul className="divide-y divide-border/80 text-sm">
                {team.memberships.map((m) => (
                  <li key={m.id} className="flex justify-between py-2">
                    <span>
                      {m.user?.name ?? m.userId}{' '}
                      <span className="text-muted-foreground">({m.user?.email})</span>
                    </span>
                    <span className="text-muted-foreground">{m.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-panel space-y-4 p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="member-email">Add member by email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <Button
              size="sm"
              disabled={pending || !memberEmail.trim()}
              onClick={() => void onAddMember()}
            >
              {pending ? <Spinner size="sm" /> : 'Add member'}
            </Button>
          </section>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
