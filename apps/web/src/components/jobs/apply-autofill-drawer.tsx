'use client';

import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  approveApplyFill,
  createApplication,
  getApplyAssist,
  getProfile,
  listApplications,
  markApplyOpened,
  runApplyFill,
  type ApplyAssistSession,
  type CareerProfile,
  type Job,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Props = {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApplyAutofillDrawer({ job, open, onOpenChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<ApplyAssistSession | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [openingApply, setOpeningApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNote(null);

    void (async () => {
      try {
        const { applications } = await listApplications();
        if (cancelled) return;
        let app = applications.find((row) => row.jobId === job.id) ?? null;
        if (!app) {
          app = await createApplication({ jobId: job.id });
        }
        if (cancelled) return;
        setApplicationId(app.id);

        const next = await getApplyAssist(app.id);
        if (cancelled) return;
        setSession(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start autofill session');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, job.id]);

  const filledIds = useMemo(() => {
    return new Set(session?.lastFillAttempt?.filled ?? []);
  }, [session?.lastFillAttempt?.filled]);

  const fields = session?.fillPlan ?? [];
  const filledCount = fields.filter((field) => {
    if (filledIds.has(field.id)) return true;
    if (!session?.lastFillAttempt) return field.value.trim().length > 0;
    return false;
  }).length;
  const fillPct = fields.length === 0 ? 0 : Math.round((filledCount / fields.length) * 100);

  const openApplyPage = useCallback(async () => {
    const url = session?.applyUrl ?? job.applyUrl;
    if (!url || !applicationId) return;

    setOpeningApply(true);
    setError(null);
    try {
      // Open the ATS tab, then immediately reclaim focus so the drawer stays visible.
      const tab = window.open(url, '_blank');
      try {
        tab?.blur();
      } catch {
        // Cross-origin / noopener — ignore.
      }
      window.focus();
      requestAnimationFrame(() => window.focus());

      const next = await markApplyOpened(applicationId);
      setSession(next);
      setNote('Apply page opened in another tab — keep this drawer open while you finish there.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open apply page');
    } finally {
      setOpeningApply(false);
    }
  }, [applicationId, job.applyUrl, session?.applyUrl]);

  const runAutofill = useCallback(async () => {
    if (!applicationId) return;
    setAutofilling(true);
    setError(null);
    setNote(null);
    try {
      if (!session?.fillApprovedAt) {
        await approveApplyFill(applicationId);
      }
      const next = await runApplyFill(applicationId);
      setSession(next);
      if (next.lastFillAttempt?.ok) {
        setNote(
          `Filled ${next.lastFillAttempt.filled.length} field(s) in the assist browser. Open the apply page to review and submit — we never auto-submit.`,
        );
      } else if (next.lastFillAttempt) {
        const detail = next.lastFillAttempt.errors[0] ?? next.playwrightDetail;
        setError(detail || 'Autofill completed with errors — copy fields manually if needed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autofill failed');
    } finally {
      setAutofilling(false);
    }
  }, [applicationId, session?.fillApprovedAt]);

  async function copyField(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  async function openProfileModal() {
    setProfileOpen(true);
    if (profile) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      setProfile(await getProfile());
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      setProfileLoading(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close autofill drawer"
        className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[1px] transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Apply with AutoFill"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col',
          'border-l border-border bg-background shadow-lift animate-enter',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <BrandMark href="/dashboard" size="sm" compact className="min-w-0" />
            <p className="mt-1 truncate pl-[calc(1.75rem+0.625rem)] text-xs text-muted-foreground">
              {job.company.name} · {job.title}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Collapse drawer"
            onClick={() => onOpenChange(false)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={loading || openingApply || !(session?.applyUrl ?? job.applyUrl)}
              onClick={() => void openApplyPage()}
            >
              {openingApply ? <Spinner size="sm" /> : <ExternalLink className="h-4 w-4" />}
              Open apply page
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base"
              disabled={loading || autofilling || !applicationId || fields.length === 0}
              onClick={() => void runAutofill()}
            >
              {autofilling ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
              {autofilling ? 'Autofilling…' : 'Autofill'}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Stay on JobMatch while you work. Autofill runs a secure fill-only assist browser for
              supported ATS forms — it never submits. Use Open apply page to review and submit
              yourself.
            </p>
          </div>

          <button
            type="button"
            className="text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => void openProfileModal()}
          >
            Your Autofill Information
          </button>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" /> Preparing fill plan…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Form fields
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {fillPct}% filled
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({filledCount}/{fields.length})
                    </span>
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              {fields.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  No fill-plan fields yet. Complete your profile, attach a resume, and generate a
                  cover letter draft for this role.
                </p>
              ) : (
                <ul className="space-y-2">
                  {fields.map((field) => {
                    const done =
                      filledIds.has(field.id) ||
                      (!session?.lastFillAttempt && field.value.trim().length > 0);
                    return (
                      <li
                        key={field.id}
                        className="flex gap-2 rounded-lg border border-border/80 bg-card/60 px-3 py-2.5 text-sm"
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{field.label}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {field.value || 'Empty — add this in your profile or draft'}
                          </p>
                        </div>
                        {field.value ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={() => void copyField(field.id, field.value)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedId === field.id ? 'Copied' : 'Copy'}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              {session?.playwrightDetail ? (
                <p className="text-xs text-muted-foreground">{session.playwrightDetail}</p>
              ) : null}
            </>
          )}

          {note ? (
            <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              {note}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </aside>

      {profileOpen
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Close profile modal"
                className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
                onClick={() => setProfileOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Your Autofill Information"
                className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-lift animate-enter"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">
                      Your Autofill Information
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Details from your career profile used for application forms.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close"
                    onClick={() => setProfileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5">
                  {profileLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size="sm" /> Loading profile…
                    </div>
                  ) : profileError ? (
                    <p className="text-sm text-destructive">{profileError}</p>
                  ) : profile ? (
                    <ProfileAutofillSummary profile={profile} />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>,
    document.body,
  );
}

function ProfileAutofillSummary({ profile }: { profile: CareerProfile }) {
  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Headline', value: profile.headline },
    { label: 'Summary', value: profile.summary },
    { label: 'Phone', value: profile.phone },
    { label: 'Address', value: profile.address },
    {
      label: 'Location',
      value: [profile.city, profile.country].filter(Boolean).join(', ') || null,
    },
    { label: 'Current title', value: profile.currentJobTitle },
    {
      label: 'Years of experience',
      value:
        profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : null,
    },
    { label: 'Desired roles', value: profile.desiredRoles.join(', ') || null },
    { label: 'Employment type', value: profile.employmentType },
    { label: 'Work authorization', value: profile.workAuthorization },
    {
      label: 'Visa sponsorship',
      value: profile.visaSponsorshipNeeded ? 'Needed' : 'Not needed',
    },
    { label: 'Work preference', value: profile.workLocationPreference },
    { label: 'LinkedIn', value: profile.linkedinUrl },
    { label: 'GitHub', value: profile.githubUrl },
    { label: 'Portfolio', value: profile.portfolioUrl },
    { label: 'Website', value: profile.websiteUrl },
    {
      label: 'Skills',
      value: profile.skills.map((s) => s.name).filter(Boolean).join(', ') || null,
    },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {row.value?.trim() ? row.value : '—'}
            </dd>
          </div>
        ))}
      </dl>

      {profile.workExperience.length > 0 ? (
        <section>
          <h3 className="font-display text-sm font-semibold">Work experience</h3>
          <ul className="mt-2 space-y-2">
            {profile.workExperience.map((job, index) => (
              <li
                key={`${job.company}-${job.title}-${index}`}
                className="rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {job.title || 'Role'}
                  {job.company ? ` · ${job.company}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[job.startMonth, job.isCurrent ? 'Present' : job.endMonth]
                    .filter(Boolean)
                    .join(' – ') || 'Dates not set'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.education.length > 0 ? (
        <section>
          <h3 className="font-display text-sm font-semibold">Education</h3>
          <ul className="mt-2 space-y-2">
            {profile.education.map((edu, index) => (
              <li
                key={`${edu.school}-${index}`}
                className="rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <p className="font-medium">{edu.school || 'School'}</p>
                <p className="text-xs text-muted-foreground">
                  {[edu.degree, edu.field].filter(Boolean).join(' · ') || 'Details not set'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Profile completeness: {profile.completenessScore}%
      </p>
    </div>
  );
}
