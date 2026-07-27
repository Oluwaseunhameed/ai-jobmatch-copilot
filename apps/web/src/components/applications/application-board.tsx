'use client';

import Link from 'next/link';
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGES,
  type ApplicationStage,
} from '@jobmatch/types';
import { ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  deleteApplication,
  listApplications,
  updateApplication,
  type Application,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { ApplicationBoardSkeleton } from './application-board-skeleton';
import { ApplyAssistPanel } from './apply-assist-panel';

const DRAG_TYPE = 'application/x-jobmatch-application-id';

export function ApplicationBoard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<ApplicationStage | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { applications: rows } = await listApplications();
      setApplications(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(
      APPLICATION_STAGES.map((stage) => [stage, [] as Application[]]),
    ) as Record<ApplicationStage, Application[]>;
    for (const row of applications) {
      const stage = (APPLICATION_STAGES.includes(row.stage as ApplicationStage)
        ? row.stage
        : 'preparing') as ApplicationStage;
      map[stage].push(row);
    }
    return map;
  }, [applications]);

  const selected = applications.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    setNotesDraft(selected?.notes ?? '');
  }, [selected?.id, selected?.notes]);

  async function move(id: string, stage: ApplicationStage) {
    const current = applications.find((row) => row.id === id);
    if (!current || current.stage === stage) return;

    const previousStage = current.stage;
    const previousLabel = current.stageLabel;

    // Optimistic move so the board feels immediate.
    setApplications((rows) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, stage, stageLabel: APPLICATION_STAGE_LABELS[stage] }
          : row,
      ),
    );
    setBusyId(id);
    setError(null);

    try {
      const updated = await updateApplication(id, { stage });
      setApplications((rows) => rows.map((row) => (row.id === id ? updated : row)));
    } catch (err) {
      setApplications((rows) =>
        rows.map((row) =>
          row.id === id
            ? { ...row, stage: previousStage, stageLabel: previousLabel }
            : row,
        ),
      );
      setError(err instanceof Error ? err.message : 'Could not update stage');
    } finally {
      setBusyId(null);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    setBusyId(selected.id);
    setError(null);
    try {
      const updated = await updateApplication(selected.id, {
        notes: notesDraft.trim() || null,
      });
      setApplications((rows) => rows.map((row) => (row.id === selected.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteApplication(id);
      setApplications((rows) => rows.filter((row) => row.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove application');
    } finally {
      setBusyId(null);
    }
  }

  function onDragStart(event: React.DragEvent, id: string) {
    event.dataTransfer.setData(DRAG_TYPE, id);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropStage(null);
  }

  function onColumnDragOver(event: React.DragEvent, stage: ApplicationStage) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropStage !== stage) setDropStage(stage);
  }

  function onColumnDragLeave(event: React.DragEvent, stage: ApplicationStage) {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    if (dropStage === stage) setDropStage(null);
  }

  function onColumnDrop(event: React.DragEvent, stage: ApplicationStage) {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData('text/plain');
    setDropStage(null);
    setDraggingId(null);
    if (id) void move(id, stage);
  }

  if (loading) {
    return <ApplicationBoardSkeleton />;
  }

  if (applications.length === 0) {
    return (
      <div className="surface-panel p-8 text-center">
        <p className="font-display text-xl font-semibold tracking-tight">No applications yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a job and choose “Add to pipeline” to start tracking.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Drag cards between columns, or use the stage menu on each card.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {APPLICATION_STAGES.map((stage) => (
          <section
            key={stage}
            onDragOver={(event) => onColumnDragOver(event, stage)}
            onDragLeave={(event) => onColumnDragLeave(event, stage)}
            onDrop={(event) => onColumnDrop(event, stage)}
            className={cn(
              'flex w-64 shrink-0 flex-col rounded-xl border border-border/80 bg-muted/20 transition',
              dropStage === stage && 'border-primary/50 bg-primary/5 ring-2 ring-primary/30',
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {APPLICATION_STAGE_LABELS[stage]}
              </h2>
              <span className="rounded-md bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {byStage[stage].length}
              </span>
            </header>
            <div className="flex min-h-28 flex-1 flex-col gap-2 p-2">
              {byStage[stage].map((row) => (
                <article
                  key={row.id}
                  draggable={busyId !== row.id}
                  onDragStart={(event) => onDragStart(event, row.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'rounded-lg border border-border bg-background p-3 shadow-soft transition',
                    selectedId === row.id && 'ring-2 ring-primary/40',
                    draggingId === row.id && 'opacity-50',
                    busyId === row.id ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70"
                      aria-hidden
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <p className="text-xs font-medium text-primary">
                        {row.job?.companyName ?? 'Company'}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-snug">
                        {row.job?.title ?? 'Role'}
                      </p>
                      {row.job?.location && (
                        <p className="mt-1 text-xs text-muted-foreground">{row.job.location}</p>
                      )}
                    </button>
                  </div>

                  <label className="mt-3 block">
                    <span className="sr-only">Move stage</span>
                    <select
                      value={row.stage}
                      disabled={busyId === row.id}
                      onChange={(event) =>
                        void move(row.id, event.target.value as ApplicationStage)
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {APPLICATION_STAGES.map((option) => (
                        <option key={option} value={option}>
                          {APPLICATION_STAGE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
              {byStage[stage].length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  {dropStage === stage ? 'Drop here' : 'Empty'}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {selected && (
        <div className="surface-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {selected.job?.companyName ?? 'Company'}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
                {selected.job?.title ?? 'Role'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Stage: {selected.stageLabel}
                {selected.resume ? ` · Resume: ${selected.resume.title}` : ''}
                {selected.draft ? ` · Draft: ${selected.draft.status}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.job?.slug && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/jobs/${selected.job.slug}`}>View job</Link>
                </Button>
              )}
              {selected.job?.applyUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={selected.job.applyUrl} target="_blank" rel="noreferrer">
                    Apply
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === selected.id}
                onClick={() => void remove(selected.id)}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>

          <label className="mt-4 block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </span>
            <textarea
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed"
              placeholder="Interview dates, contacts, follow-ups…"
            />
          </label>
          <Button
            className="mt-3"
            size="sm"
            disabled={busyId === selected.id || notesDraft === (selected.notes ?? '')}
            onClick={() => void saveNotes()}
          >
            {busyId === selected.id ? <Spinner size="sm" /> : null}
            Save notes
          </Button>

          <ApplyAssistPanel
            application={selected}
            onApplicationUpdated={() => {
              void listApplications().then((data) => setApplications(data.applications));
            }}
          />
        </div>
      )}
    </div>
  );
}
