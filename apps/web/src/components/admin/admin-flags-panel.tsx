'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { AdminFeatureFlag } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function AdminFlagsPanel({ flags: initial }: { flags: AdminFeatureFlag[] }) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function toggle(key: string, enabled: boolean) {
    setError(null);
    setPendingKey(key);
    const previous = flags;
    setFlags((rows) => rows.map((f) => (f.key === key ? { ...f, enabled } : f)));
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      const data = (await res.json()) as AdminFeatureFlag & { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.error?.message ?? 'Update failed');
      }
      setFlags((rows) => rows.map((f) => (f.key === key ? { ...f, ...data } : f)));
      startTransition(() => router.refresh());
    } catch (err) {
      setFlags(previous);
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="divide-y divide-border/70 rounded-lg border border-border/80">
        {flags.map((flag) => (
          <li key={flag.key} className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <p className="font-medium">{flag.key}</p>
              {flag.description && (
                <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flag.enabled}
              disabled={pendingKey === flag.key || isPending}
              onClick={() => void toggle(flag.key, !flag.enabled)}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                flag.enabled ? 'bg-primary' : 'bg-muted',
                (pendingKey === flag.key || isPending) && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform',
                  flag.enabled ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
