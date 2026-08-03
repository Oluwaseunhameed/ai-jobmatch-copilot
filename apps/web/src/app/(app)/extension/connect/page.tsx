'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Puzzle } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type BrowserKind = 'firefox' | 'chrome' | 'other';

function detectBrowser(): BrowserKind {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Edg\//i.test(ua) || /Chrome\//i.test(ua) || /Chromium\//i.test(ua)) return 'chrome';
  return 'other';
}

function pingExtension() {
  window.postMessage(
    { source: 'jobmatch-extension-connect', type: 'JOBMATCH_EXTENSION_PING' },
    window.location.origin,
  );
}

export default function ExtensionConnectPage() {
  const [browser] = useState<BrowserKind>(() => detectBrowser());
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedDebug, setCopiedDebug] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const debugUrl =
    browser === 'firefox' ? 'about:debugging#/runtime/this-firefox' : 'chrome://extensions';

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; ok?: boolean } | null;
      if (data?.source !== 'jobmatch-extension') return;
      if (data.type === 'JOBMATCH_EXTENSION_READY') {
        setExtensionReady(true);
      }
      if (data.type === 'JOBMATCH_EXTENSION_TOKEN_SAVED' && data.ok) {
        setConnected(true);
        setExtensionReady(true);
      }
    }
    window.addEventListener('message', onMessage);
    pingExtension();
    const id = window.setInterval(pingExtension, 2000);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(id);
    };
  }, []);

  async function copyText(value: string, kind: 'token' | 'debug') {
    await navigator.clipboard.writeText(value);
    if (kind === 'token') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      setCopiedDebug(true);
      window.setTimeout(() => setCopiedDebug(false), 1500);
    }
  }

  async function connect() {
    setPending(true);
    setError(null);
    setConnected(false);
    try {
      const res = await fetch('/api/extension/token', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
      }
      const nextToken = body.token as string;
      setToken(nextToken);
      setExpiresAt(body.expiresAt as string);

      try {
        await navigator.clipboard.writeText(nextToken);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard may be blocked; user can still copy manually.
      }

      window.postMessage(
        {
          source: 'jobmatch-extension-connect',
          type: 'JOBMATCH_EXTENSION_TOKEN',
          token: nextToken,
          appUrl: body.appUrl || window.location.origin,
          expiresAt: body.expiresAt,
        },
        window.location.origin,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Autofill');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-3">
        <BrandMark href="/dashboard" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">Apply Autofill</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Fill employer application forms from your JobMatch profile. Install the add-on once, connect
          your account, then click the JM tab on any apply page.
        </p>
      </div>

      <div className="surface-panel space-y-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Extension status</p>
            <p className="text-sm text-muted-foreground">
              {connected
                ? 'Connected — you’re ready to Autofill apply pages.'
                : extensionReady
                  ? 'Extension detected. Connect your account below.'
                  : 'Extension not detected yet. Install it, then come back here.'}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              connected
                ? 'bg-primary/10 text-primary'
                : extensionReady
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {connected ? 'Connected' : extensionReady ? 'Installed' : 'Not installed'}
          </span>
        </div>

        <ol className="space-y-5">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Install JobMatch Autofill</p>
              {browser === 'firefox' ? (
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Paste the address below into Firefox’s address bar →{' '}
                    <strong>Load Temporary Add-on…</strong> → choose{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">manifest.json</code> inside{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/extension</code>.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-muted px-2 py-1 text-xs">{debugUrl}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyText(debugUrl, 'debug')}
                    >
                      {copiedDebug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedDebug ? 'Copied' : 'Copy address'}
                    </Button>
                  </div>
                  <p className="text-xs">
                    After a Firefox restart, load the add-on again the same way.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Paste the address below into Chrome’s address bar → turn on{' '}
                    <strong>Developer mode</strong> → <strong>Load unpacked</strong> → select the{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/extension</code> folder.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-muted px-2 py-1 text-xs">{debugUrl}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyText(debugUrl, 'debug')}
                    >
                      {copiedDebug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedDebug ? 'Copied' : 'Copy address'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Connect your account</p>
                <p className="text-muted-foreground">
                  One click links Autofill to your JobMatch profile. Stays connected for 90 days.
                </p>
              </div>
              <Button disabled={pending || connected} onClick={() => void connect()}>
                {pending ? (
                  <Spinner size="sm" />
                ) : connected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Puzzle className="h-4 w-4" />
                )}
                {connected ? 'Connected' : pending ? 'Connecting…' : 'Connect Autofill'}
              </Button>
              {connected ? (
                <p className="text-sm font-medium text-primary">
                  You’re all set. Open an employer apply page and use the JM tab.
                </p>
              ) : null}
            </div>
          </li>

          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Use it on apply pages</p>
              <p className="text-muted-foreground">
                Open a job application → click the teal <strong>JM</strong> tab on the right →{' '}
                <strong>Autofill</strong>. We never submit the form for you.
              </p>
            </div>
          </li>
        </ol>

        {token && !connected ? (
          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
            <p className="text-sm font-medium">Finish connecting in the extension</p>
            <p className="text-sm text-muted-foreground">
              {extensionReady
                ? 'If status doesn’t switch to Connected, open the extension popup → paste the code → Save.'
                : 'Install the extension, open its popup, paste the code, then Save.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(token, 'token')}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy connect code'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowManual((v) => !v)}>
                {showManual ? 'Hide code' : 'Show code'}
              </Button>
            </div>
            {showManual ? (
              <textarea
                readOnly
                value={token}
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            ) : null}
            {expiresAt ? (
              <p className="text-xs text-muted-foreground">
                Expires {new Date(expiresAt).toLocaleDateString()}
              </p>
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
