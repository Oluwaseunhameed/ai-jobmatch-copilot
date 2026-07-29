'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AdminFeatureFlag } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function AdminFlagsPanel({ flags: initial }: { flags: AdminFeatureFlag[] }) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateFlag(
    key: string,
    input: { enabled: boolean; rolloutPercent?: number | null },
  ) {
    setError(null);
    setPendingKey(key);
    const previous = flags;
    setFlags((rows) =>
      rows.map((f) =>
        f.key === key
          ? {
              ...f,
              enabled: input.enabled,
              ...(input.rolloutPercent === undefined
                ? {}
                : { rolloutPercent: input.rolloutPercent }),
            }
          : f,
      ),
    );
    try {
      const body: Record<string, unknown> = { key, enabled: input.enabled };
      if (input.rolloutPercent !== undefined) body.rolloutPercent = input.rolloutPercent;
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <div className="space-y-3">
        {flags.map((flag) => {
          const switchId = `admin-flag-${flag.key}`;
          const busy = pendingKey === flag.key || isPending;

          return (
            <div
              key={flag.key}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/80 bg-card/60 p-4"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor={switchId} className="cursor-pointer font-medium">
                  {flag.key}
                </Label>
                {flag.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Label htmlFor={`${switchId}-rollout`} className="text-xs text-muted-foreground">
                    Rollout %
                  </Label>
                  <input
                    id={`${switchId}-rollout`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={flag.rolloutPercent ?? ''}
                    className="h-8 w-20 rounded-md border border-border/80 bg-background px-2 text-sm"
                    disabled={busy}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim() === '') {
                        void updateFlag(flag.key, { enabled: flag.enabled, rolloutPercent: null });
                        return;
                      }
                      const num = Number(raw);
                      if (!Number.isFinite(num)) return;
                      if (num < 0 || num > 100) return;
                      void updateFlag(flag.key, { enabled: flag.enabled, rolloutPercent: num });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {flag.rolloutPercent == null ? 'All' : `${flag.rolloutPercent}%`}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 pt-0.5">
                <span
                  className={cn(
                    'min-w-[2rem] text-right text-xs font-medium tabular-nums',
                    flag.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
                  )}
                >
                  {flag.enabled ? 'On' : 'Off'}
                </span>
                <Switch
                  id={switchId}
                  checked={flag.enabled}
                  disabled={busy}
                  aria-label={`Toggle ${flag.key}`}
                  onCheckedChange={(enabled) => void updateFlag(flag.key, { enabled })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
