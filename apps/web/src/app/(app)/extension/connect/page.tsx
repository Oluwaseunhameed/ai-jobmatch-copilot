'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Puzzle } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function ExtensionConnectPage() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [extensionSaved, setExtensionSaved] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; ok?: boolean } | null;
      if (data?.source !== 'jobmatch-extension') return;
      if (data.type === 'JOBMATCH_EXTENSION_TOKEN_SAVED' && data.ok) {
        setExtensionSaved(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  async function issueToken() {
    setPending(true);
    setError(null);
    setExtensionSaved(false);
    try {
      const res = await fetch('/api/extension/token', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
      }
      setToken(body.token as string);
      setExpiresAt(body.expiresAt as string);

      // Push into the installed extension when the connect-bridge content script is present.
      window.postMessage(
        {
          source: 'jobmatch-extension-connect',
          type: 'JOBMATCH_EXTENSION_TOKEN',
          token: body.token,
          appUrl: body.appUrl || window.location.origin,
          expiresAt: body.expiresAt,
        },
        window.location.origin,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create extension token');
    } finally {
      setPending(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-3">
        <BrandMark href="/dashboard" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Connect browser extension
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Path B puts AutoFill on the employer apply page. Generate a token, paste it into the
          JobMatch Copilot extension popup, then open any apply tab — the drawer appears on the
          right.
        </p>
      </div>

      <div className="surface-panel space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Puzzle className="mt-0.5 h-5 w-5 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">1. Load the extension</p>
            <p className="text-muted-foreground">
              Chrome → Extensions → Developer mode → Load unpacked → select{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/extension</code> from this
              repo.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Puzzle className="mt-0.5 h-5 w-5 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">2. Generate a token</p>
            <p className="text-muted-foreground">
              Tokens last 90 days and only work for your account.
            </p>
          </div>
        </div>
        <Button disabled={pending} onClick={() => void issueToken()}>
          {pending ? <Spinner size="sm" /> : null}
          {token ? 'Generate new token' : 'Generate extension token'}
        </Button>

        {token ? (
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Extension token
            </label>
            <textarea
              readOnly
              value={token}
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyToken()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy token'}
              </Button>
              {expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {extensionSaved
                ? '3. Extension connected automatically. Open an employer apply page and click the JM tab.'
                : '3. If the extension did not auto-connect, open its popup → paste token → Save. Then visit an apply page.'}
            </p>
            {extensionSaved ? (
              <p className="text-xs font-medium text-primary">Extension saved this token.</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
