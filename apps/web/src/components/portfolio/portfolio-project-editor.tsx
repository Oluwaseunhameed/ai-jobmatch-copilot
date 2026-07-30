'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  PORTFOLIO_PROJECT_STATUSES,
  PORTFOLIO_STATUS_LABELS,
  createPortfolioProject,
  deletePortfolioProject,
  updatePortfolioProject,
  type PortfolioProject,
  type PortfolioProjectStatus,
} from '@/lib/api-client';

type Draft = {
  title: string;
  summary: string;
  role: string;
  status: PortfolioProjectStatus;
  techStack: string;
  highlights: string;
  problem: string;
  solution: string;
  impact: string;
  repoUrl: string;
  demoUrl: string;
  startMonth: string;
  endMonth: string;
  isFeatured: boolean;
};

function toDraft(project: PortfolioProject | null): Draft {
  return {
    title: project?.title ?? '',
    summary: project?.summary ?? '',
    role: project?.role ?? '',
    status: (project?.status as PortfolioProjectStatus) || 'draft',
    techStack: project?.techStack.join(', ') ?? '',
    highlights: project?.highlights.join('\n') ?? '',
    problem: project?.problem ?? '',
    solution: project?.solution ?? '',
    impact: project?.impact ?? '',
    repoUrl: project?.repoUrl ?? '',
    demoUrl: project?.demoUrl ?? '',
    startMonth: project?.startMonth ?? '',
    endMonth: project?.endMonth ?? '',
    isFeatured: project?.isFeatured ?? false,
  };
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function PortfolioProjectEditor({ project }: { project: PortfolioProject | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(project));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const previewBullets = useMemo(() => {
    const highlights = splitList(draft.highlights);
    if (highlights.length) return highlights;
    const bullets: string[] = [];
    if (draft.problem.trim() && draft.solution.trim()) {
      bullets.push(
        `${draft.role.trim() ? `${draft.role.trim()}: ` : ''}Addressed ${draft.problem.trim()} by ${draft.solution.trim()}.`,
      );
    }
    if (draft.impact.trim()) bullets.push(draft.impact.trim());
    return bullets;
  }, [draft]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    setError(null);
    const payload = {
      title: draft.title,
      summary: draft.summary || null,
      role: draft.role || null,
      status: draft.status,
      techStack: splitList(draft.techStack),
      highlights: splitList(draft.highlights),
      problem: draft.problem || null,
      solution: draft.solution || null,
      impact: draft.impact || null,
      repoUrl: draft.repoUrl || null,
      demoUrl: draft.demoUrl || null,
      startMonth: draft.startMonth || null,
      endMonth: draft.endMonth || null,
      isFeatured: draft.isFeatured,
    };

    try {
      if (project) {
        await updatePortfolioProject(project.id, payload);
      } else {
        await createPortfolioProject(payload);
      }
      router.push('/portfolio');
      router.refresh();
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project');
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!project) return;
    if (!window.confirm('Delete this project?')) return;
    setPending(true);
    setError(null);
    try {
      await deletePortfolioProject(project.id);
      router.push('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project');
      setPending(false);
    }
  }

  async function copyBullets() {
    const text = previewBullets.map((b) => `• ${b}`).join('\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/portfolio"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Portfolio
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {project ? 'Edit project' : 'New project'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Capture the problem, solution, and impact so resume bullets stay ready to paste.
        </p>
      </div>

      <div className="surface-panel space-y-4 p-5">
        <Field label="Title">
          <Input
            value={draft.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="TypeScript API toolkit"
          />
        </Field>
        <Field label="Role">
          <Input
            value={draft.role}
            onChange={(e) => setField('role', e.target.value)}
            placeholder="Backend engineer"
          />
        </Field>
        <Field label="Summary">
          <textarea
            value={draft.summary}
            onChange={(e) => setField('summary', e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => setField('status', e.target.value as PortfolioProjectStatus)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {PORTFOLIO_PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PORTFOLIO_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isFeatured}
              onChange={(e) => setField('isFeatured', e.target.checked)}
            />
            Feature on portfolio
          </label>
        </div>
        <Field label="Tech stack (comma-separated)">
          <Input
            value={draft.techStack}
            onChange={(e) => setField('techStack', e.target.value)}
            placeholder="TypeScript, Node, PostgreSQL"
          />
        </Field>
        <Field label="Highlights (one per line)">
          <textarea
            value={draft.highlights}
            onChange={(e) => setField('highlights', e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Problem">
            <textarea
              value={draft.problem}
              onChange={(e) => setField('problem', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="Solution">
            <textarea
              value={draft.solution}
              onChange={(e) => setField('solution', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="Impact">
            <textarea
              value={draft.impact}
              onChange={(e) => setField('impact', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repo URL">
            <Input
              value={draft.repoUrl}
              onChange={(e) => setField('repoUrl', e.target.value)}
              placeholder="https://github.com/..."
            />
          </Field>
          <Field label="Demo URL">
            <Input
              value={draft.demoUrl}
              onChange={(e) => setField('demoUrl', e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start (YYYY-MM)">
            <Input
              value={draft.startMonth}
              onChange={(e) => setField('startMonth', e.target.value)}
              placeholder="2026-01"
            />
          </Field>
          <Field label="End (YYYY-MM)">
            <Input
              value={draft.endMonth}
              onChange={(e) => setField('endMonth', e.target.value)}
              placeholder="2026-03"
            />
          </Field>
        </div>
      </div>

      <div className="surface-panel space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-foreground">Resume bullets preview</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!previewBullets.length}
            onClick={() => void copyBullets()}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {previewBullets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add highlights or problem/solution/impact to generate bullets.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {previewBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !draft.title.trim()} onClick={() => void save()}>
          {pending ? <Spinner size="sm" /> : null}
          Save
        </Button>
        {project ? (
          <Button variant="outline" disabled={pending} onClick={() => void remove()}>
            Delete
          </Button>
        ) : null}
      </div>
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
