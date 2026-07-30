'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const AUTO_TRY_KEY = 'jm_finishing_signin_tried';

async function postSync(): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      message: body?.error?.message ?? `Sync failed (${res.status})`,
    };
  }
  return { ok: true };
}

export function FinishingSignIn() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);

  const goDashboard = useCallback(() => {
    window.location.assign('/dashboard');
  }, []);

  const sync = useCallback(
    async (redirect: boolean) => {
      setPending(true);
      setError(null);
      try {
        const result = await postSync();
        if (!result.ok) {
          setError(result.message);
          return;
        }
        if (redirect) {
          goDashboard();
          return;
        }
        // Prefer hard navigation — router.refresh() remounts this screen and
        // can restart the auto-retry loop when the DB user is still settling.
        goDashboard();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not finish sign-in');
      } finally {
        setPending(false);
      }
    },
    [goDashboard],
  );

  useEffect(() => {
    if (autoTried.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTO_TRY_KEY) === '1') {
      return;
    }
    autoTried.current = true;
    try {
      sessionStorage.setItem(AUTO_TRY_KEY, '1');
    } catch {
      // ignore
    }

    let cancelled = false;

    void (async () => {
      for (let i = 0; i < 3; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, i === 0 ? 300 : 1_200));
        if (cancelled) return;

        setPending(true);
        const result = await postSync().catch((err: unknown) => ({
          ok: false as const,
          message: err instanceof Error ? err.message : 'Could not finish sign-in',
        }));

        if (cancelled) return;

        if (result.ok) {
          setPending(false);
          try {
            sessionStorage.removeItem(AUTO_TRY_KEY);
          } catch {
            // ignore
          }
          goDashboard();
          return;
        }

        setError(result.message);
        setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [goDashboard, router]);

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border/80 bg-card/40 p-6 text-center">
      <h1 className="font-display text-xl font-semibold tracking-tight">Finishing sign-in</h1>
      <p className="text-sm text-muted-foreground">
        Your Clerk session is ready, but your account profile is still syncing. Wait a moment —
        we will retry automatically — or continue to the dashboard.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col items-center gap-2 pt-1">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void sync(true)}
          className="min-w-[12rem]"
        >
          {pending ? <Spinner size="sm" label="Syncing account" /> : null}
          Continue to dashboard
        </Button>
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            try {
              sessionStorage.removeItem(AUTO_TRY_KEY);
            } catch {
              // ignore
            }
            void sync(false);
          }}
        >
          Retry sync
        </button>
      </div>
    </div>
  );
}
