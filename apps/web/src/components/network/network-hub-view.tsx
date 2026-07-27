'use client';

import Link from 'next/link';
import { Building2, Copy, ExternalLink, Network } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  NETWORKING_CONTACT_STATUSES,
  NETWORKING_ROLE_LABELS,
  NETWORKING_ROLE_TYPES,
  NETWORKING_STATUS_LABELS,
  createNetworkingContact,
  deleteNetworkingContact,
  updateNetworkingContact,
  type NetworkingContact,
  type NetworkingContactStatus,
  type NetworkingHub,
  type NetworkingRoleType,
  type NetworkingTalkTrack,
  type NetworkingTarget,
} from '@/lib/api-client';

function talkTracksFor(target: NetworkingTarget | null): NetworkingTalkTrack[] {
  const company = target?.companyName ?? 'the company';
  const role = target?.sampleJob?.title ?? 'open roles';
  return [
    {
      id: 'email_intro',
      channel: 'email',
      title: 'Intro email',
      subject: `Interest in ${role} at ${company}`,
      body: [
        'Hi there,',
        '',
        `I'm exploring opportunities at ${company}${target?.sampleJob ? ` (especially ${role})` : ''}.`,
        'Would you be open to a short conversation about how I might contribute?',
        '',
        'Thanks',
      ].join('\n'),
      detail: 'Copy into your mail client. We do not send on your behalf.',
    },
    {
      id: 'linkedin_dm',
      channel: 'linkedin_dm',
      title: 'LinkedIn DM (paste)',
      subject: null,
      body: `Hi — I'm interested in ${company}'s ${role}. Would you be open to a brief chat or pointer to the right person?`,
      detail: 'Paste into LinkedIn yourself. We never scrape or message LinkedIn for you.',
    },
    {
      id: 'careers_note',
      channel: 'careers_note',
      title: 'Careers-page note',
      subject: null,
      body: `Interest: ${role} at ${company}. Looking to connect with the hiring team via public channels only.`,
      detail: 'Short note for careers forms or recruiter portals.',
    },
  ];
}

export function NetworkHubView({ hub: initial }: { hub: NetworkingHub }) {
  const [hub, setHub] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    fullName: '',
    companyName: '',
    companyId: initial.targets[0]?.companyId ?? '',
    roleType: 'recruiter' as NetworkingRoleType,
    title: '',
    profileUrl: '',
    email: '',
    notes: '',
  });

  const selectedTarget = useMemo(
    () => hub.targets.find((t) => t.companyId === draft.companyId) ?? hub.targets[0] ?? null,
    [hub.targets, draft.companyId],
  );
  const talkTracks = useMemo(() => talkTracksFor(selectedTarget), [selectedTarget]);

  async function addContact() {
    setPending(true);
    setError(null);
    try {
      const contact = await createNetworkingContact({
        fullName: draft.fullName,
        companyId: draft.companyId || selectedTarget?.companyId || null,
        companyName: draft.companyName || selectedTarget?.companyName || null,
        roleType: draft.roleType,
        title: draft.title || null,
        profileUrl: draft.profileUrl || null,
        email: draft.email || null,
        notes: draft.notes || null,
        relatedJobId: selectedTarget?.sampleJob?.id ?? null,
        status: 'to_contact',
      });
      setHub((current) => {
        const contacts = [contact, ...current.contacts.filter((c) => c.id !== contact.id)];
        return {
          ...current,
          contacts,
          contactCount: contacts.length,
          activeCount: contacts.filter((c) => c.status !== 'closed').length,
          summary: `You are tracking ${contacts.length} contact${contacts.length === 1 ? '' : 's'} across ${current.targets.length} target compan${current.targets.length === 1 ? 'y' : 'ies'}.`,
        };
      });
      setDraft((current) => ({
        ...current,
        fullName: '',
        title: '',
        profileUrl: '',
        email: '',
        notes: '',
        roleType: 'recruiter',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add contact');
    } finally {
      setPending(false);
    }
  }

  async function setStatus(contact: NetworkingContact, status: NetworkingContactStatus) {
    setPending(true);
    setError(null);
    try {
      const updated = await updateNetworkingContact(contact.id, {
        fullName: contact.fullName,
        companyId: contact.companyId,
        companyName: contact.companyName,
        roleType: contact.roleType,
        title: contact.title,
        profileUrl: contact.profileUrl,
        email: contact.email,
        notes: contact.notes,
        relatedJobId: contact.relatedJobId,
        status,
      });
      setHub((current) => {
        const contacts = current.contacts.map((c) => (c.id === updated.id ? updated : c));
        return {
          ...current,
          contacts,
          activeCount: contacts.filter((c) => c.status !== 'closed').length,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setPending(false);
    }
  }

  async function removeContact(id: string) {
    if (!window.confirm('Remove this contact?')) return;
    setPending(true);
    setError(null);
    try {
      await deleteNetworkingContact(id);
      setHub((current) => {
        const contacts = current.contacts.filter((c) => c.id !== id);
        return {
          ...current,
          contacts,
          contactCount: contacts.length,
          activeCount: contacts.filter((c) => c.status !== 'closed').length,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete contact');
    } finally {
      setPending(false);
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Professional networking
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Outreach from public signals
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{hub.summary}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Contacts" value={String(hub.contactCount)} />
        <Stat label="Active" value={String(hub.activeCount)} />
        <Stat label="Target companies" value={String(hub.targets.length)} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl font-semibold tracking-tight">Target companies</h2>
        </div>
        {hub.targets.length === 0 ? (
          <div className="surface-panel p-5 text-sm text-muted-foreground">
            Save jobs or start applications to seed targets from catalog companies.{' '}
            <Link href="/jobs" className="font-medium text-foreground underline-offset-4 hover:underline">
              Browse jobs
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {hub.targets.map((target) => (
              <li key={target.id} className="surface-panel p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {target.source.replace('_', ' ')} · {target.openRoles} open roles
                </p>
                <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                  {target.companyName}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{target.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {target.researchLinks.slice(0, 3).map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target={link.url.startsWith('/') ? undefined : '_blank'}
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {link.label}
                      {!link.url.startsWith('/') ? <ExternalLink className="h-3 w-3" /> : null}
                    </a>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  size="sm"
                  variant={draft.companyId === target.companyId ? 'default' : 'outline'}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      companyId: target.companyId,
                      companyName: target.companyName,
                    }))
                  }
                >
                  Use for outreach
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Talk tracks</h2>
        <p className="text-sm text-muted-foreground">
          Templates for {selectedTarget?.companyName ?? 'your next company'}. Copy and send yourself
          — we never scrape LinkedIn or auto-message.
        </p>
        <ul className="space-y-3">
          {talkTracks.map((track) => (
            <li key={track.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{track.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{track.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText(
                      track.id,
                      [track.subject ? `Subject: ${track.subject}` : null, track.body]
                        .filter(Boolean)
                        .join('\n\n'),
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedId === track.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {track.subject ? (
                <p className="mt-3 text-sm font-medium text-foreground">{track.subject}</p>
              ) : null}
              <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{track.body}</pre>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl font-semibold tracking-tight">Contact CRM</h2>
        </div>
        <div className="surface-panel grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input
              value={draft.fullName}
              onChange={(e) => setDraft((c) => ({ ...c, fullName: e.target.value }))}
              placeholder="Alex Recruiter"
            />
          </Field>
          <Field label="Company">
            <Input
              value={draft.companyName}
              onChange={(e) => setDraft((c) => ({ ...c, companyName: e.target.value }))}
              placeholder={selectedTarget?.companyName ?? 'Acme'}
            />
          </Field>
          <Field label="Role type">
            <select
              value={draft.roleType}
              onChange={(e) =>
                setDraft((c) => ({ ...c, roleType: e.target.value as NetworkingRoleType }))
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {NETWORKING_ROLE_TYPES.map((role) => (
                <option key={role} value={role}>
                  {NETWORKING_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
              placeholder="Technical Recruiter"
            />
          </Field>
          <Field label="Public profile URL">
            <Input
              value={draft.profileUrl}
              onChange={(e) => setDraft((c) => ({ ...c, profileUrl: e.target.value }))}
              placeholder="https://..."
            />
          </Field>
          <Field label="Email (optional)">
            <Input
              value={draft.email}
              onChange={(e) => setDraft((c) => ({ ...c, email: e.target.value }))}
              placeholder="alex@company.com"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button disabled={pending || !draft.fullName.trim()} onClick={() => void addContact()}>
              {pending ? <Spinner size="sm" /> : null}
              Add contact
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {hub.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contacts yet — add people you research manually.
          </p>
        ) : (
          <ul className="space-y-3">
            {hub.contacts.map((contact) => (
              <li key={contact.id} className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {NETWORKING_ROLE_LABELS[contact.roleType as NetworkingRoleType] ??
                        contact.roleType}{' '}
                      ·{' '}
                      {NETWORKING_STATUS_LABELS[contact.status as NetworkingContactStatus] ??
                        contact.status}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {contact.fullName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {contact.companyName ?? contact.company?.name ?? 'No company'}
                      {contact.title ? ` · ${contact.title}` : ''}
                    </p>
                    {contact.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{contact.notes}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.profileUrl ? (
                        <a
                          href={contact.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Profile
                        </a>
                      ) : null}
                      {contact.company?.slug ? (
                        <Link
                          href={`/companies/${contact.company.slug}`}
                          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Company
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      value={contact.status}
                      disabled={pending}
                      onChange={(e) =>
                        void setStatus(contact, e.target.value as NetworkingContactStatus)
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      {NETWORKING_CONTACT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {NETWORKING_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void removeContact(contact.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
