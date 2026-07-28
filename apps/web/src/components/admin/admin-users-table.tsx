'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { APP_ROLES, type AdminUserRow } from '@/lib/api-client';

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function setRole(userId: string, role: string) {
    setError(null);
    setPendingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.error?.message ?? 'Update failed');
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">User</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Plan</th>
              <th className="px-3 py-2.5 font-medium">Onboarded</th>
              <th className="px-3 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </td>
                <td className="px-3 py-3">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={user.role}
                    disabled={pendingId === user.id || isPending}
                    onChange={(e) => void setRole(user.id, e.target.value)}
                  >
                    {APP_ROLES.map((role) => (
                      <option key={role} value={role} disabled={user.id === currentUserId && role !== 'admin'}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 capitalize">
                  {user.planId}
                  {user.subscriptionStatus ? (
                    <span className="ml-1 text-xs text-muted-foreground">({user.subscriptionStatus})</span>
                  ) : null}
                </td>
                <td className="px-3 py-3">{user.onboardingCompleted ? 'Yes' : 'No'}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      )}
    </div>
  );
}
