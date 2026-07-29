'use client';

import {
  Download,
  FileText,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import {
  applyResumeToProfile,
  deleteResume,
  describeParseSource,
  getParsedJson,
  listResumes,
  parseResume,
  resumeDownloadUrl,
  setPrimaryResume,
  updateResume,
  uploadResume,
  type Resume,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { ResumeLibrarySkeleton } from './resume-library-skeleton';

type PendingAction = {
  resumeId: string;
  type: 'title' | 'primary' | 'delete' | 'parse' | 'apply';
};

const PARSE_POLL_INTERVAL_MS = 2_500;
/** ~3 minutes: comfortably longer than an LLM-enriched parse, short enough to notice. */
const MAX_PARSE_POLLS = 72;

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function fileKind(mimeType: string) {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('msword')) return 'DOCX';
  return 'File';
}

function sortResumes(list: Resume[]) {
  return [...list].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return Number(b.isPrimary) - Number(a.isPrimary);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function parseBadge(status: string) {
  switch (status) {
    case 'ready':
      return { label: 'Parsed', className: 'bg-secondary text-secondary-foreground' };
    case 'queued':
    case 'processing':
      return { label: status === 'queued' ? 'Queued' : 'Parsing', className: 'bg-muted text-muted-foreground' };
    case 'failed':
      return { label: 'Parse failed', className: 'bg-destructive/15 text-destructive' };
    default:
      return { label: 'Not parsed', className: 'bg-muted text-muted-foreground' };
  }
}

export function ResumeLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const pollCountRef = useRef(0);

  const applyList = useCallback((data: Resume[]) => {
    const sorted = sortResumes(data);
    setResumes(sorted);
    setTitleDrafts(Object.fromEntries(sorted.map((r) => [r.id, r.title])));
  }, []);

  const refresh = useCallback(async () => {
    const data = await listResumes();
    applyList(data);
    return data;
  }, [applyList]);

  useEffect(() => {
    let cancelled = false;
    void listResumes()
      .then((data) => {
        if (!cancelled) applyList(data);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setResumes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyList]);

  // Parsing runs in a background worker, so the UI polls for the outcome. Bounded,
  // so a stuck job surfaces a message instead of polling forever.
  useEffect(() => {
    const inFlight = resumes?.some(
      (r) => r.parseStatus === 'queued' || r.parseStatus === 'processing',
    );

    if (!inFlight) {
      pollCountRef.current = 0;
      return;
    }

    if (pollCountRef.current >= MAX_PARSE_POLLS) {
      return;
    }

    const timer = window.setInterval(() => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_PARSE_POLLS) {
        window.clearInterval(timer);
        setError(
          'Parsing is taking longer than expected. The background worker may not be running — check that the API app is up, then retry.',
        );
        return;
      }

      void refresh().catch(() => undefined);
    }, PARSE_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [resumes, refresh]);

  const onFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      await uploadResume(file);
      pollCountRef.current = 0;
      await refresh();
      setMessage('Resume uploaded. Parsing runs in the background.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const saveTitle = async (id: string) => {
    const title = titleDrafts[id]?.trim();
    if (!title) return;
    setPending({ resumeId: id, type: 'title' });
    setError(null);
    setMessage(null);
    try {
      const updated = await updateResume(id, { title });
      setResumes((prev) =>
        prev ? sortResumes(prev.map((r) => (r.id === id ? { ...r, ...updated } : r))) : prev,
      );
      setTitleDrafts((prev) => ({ ...prev, [id]: updated.title }));
      setMessage('Title updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update title');
    } finally {
      setPending(null);
    }
  };

  const makePrimary = async (id: string) => {
    setPending({ resumeId: id, type: 'primary' });
    setError(null);
    setMessage(null);
    try {
      const updated = await setPrimaryResume(id);
      if (!updated.isPrimary) {
        throw new Error('Server did not mark this resume as primary');
      }
      setResumes((prev) =>
        prev
          ? sortResumes(
              prev.map((r) =>
                r.id === updated.id
                  ? { ...r, ...updated, isPrimary: true }
                  : { ...r, isPrimary: false },
              ),
            )
          : prev,
      );
      setMessage('Primary resume updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set primary');
      try {
        await refresh();
      } catch {
        // keep the error from setPrimary
      }
    } finally {
      setPending(null);
    }
  };

  const reparse = async (id: string) => {
    setPending({ resumeId: id, type: 'parse' });
    setError(null);
    setMessage(null);
    try {
      const updated = await parseResume(id);
      pollCountRef.current = 0;
      setResumes((prev) =>
        prev ? sortResumes(prev.map((r) => (r.id === id ? { ...r, ...updated } : r))) : prev,
      );

      if (updated.parseStatus === 'ready') {
        setMessage('Resume parsed.');
      } else if (updated.parseStatus === 'failed') {
        setError(updated.parseError || 'Parse failed');
      } else {
        // The request only queues the work; polling reports the outcome.
        setMessage('Parsing queued — this updates automatically when it finishes.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse resume');
    } finally {
      setPending(null);
    }
  };

  const applyParsed = async (id: string) => {
    setPending({ resumeId: id, type: 'apply' });
    setError(null);
    setMessage(null);
    try {
      await applyResumeToProfile(id);
      setMessage('Parsed fields applied to your career profile (empty fields only).');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply to profile');
    } finally {
      setPending(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    setPending({ resumeId: id, type: 'delete' });
    setError(null);
    setMessage(null);
    try {
      await deleteResume(id);
      await refresh();
      setMessage('Resume deleted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete resume');
    } finally {
      setPending(null);
    }
  };

  if (resumes === null && !error) {
    return <ResumeLibrarySkeleton />;
  }

  return (
    <div className="space-y-8">
      <section
        className={cn(
          'surface-panel relative overflow-hidden p-6 transition-colors duration-200',
          dragOver && 'border-primary bg-secondary/40',
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Upload
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
              Add a PDF or DOCX resume
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Drag a file here or browse. Max 5 MB. Uploads are parsed automatically for skills and
              headline suggestions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void onFiles(e.target.files);
              }}
            />
            <Button
              type="button"
              disabled={uploading}
              className="min-w-[140px]"
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Spinner label="Uploading resume" />
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Browse files
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {message && <p className="text-success">{message}</p>}
          {error && <p className="text-destructive">{error}</p>}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your library</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumes?.length
              ? `${resumes.length} resume${resumes.length === 1 ? '' : 's'} stored securely.`
              : 'No resumes yet — upload your first version to get started.'}
          </p>
        </div>

        {!resumes?.length ? (
          <div className="surface-panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/70" />
            <p className="font-medium text-foreground">Your resume library is empty</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Upload a current CV. We extract text and suggest profile fields automatically.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {resumes.map((resume) => {
              const savingTitle =
                pending?.resumeId === resume.id && pending.type === 'title';
              const settingPrimary =
                pending?.resumeId === resume.id && pending.type === 'primary';
              const deleting =
                pending?.resumeId === resume.id && pending.type === 'delete';
              const parsing =
                pending?.resumeId === resume.id && pending.type === 'parse';
              const applying =
                pending?.resumeId === resume.id && pending.type === 'apply';
              const rowBusy =
                savingTitle || settingPrimary || deleting || parsing || applying;
              const badge = parseBadge(resume.parseStatus);
              const parsed = getParsedJson(resume);
              const isParsing =
                resume.parseStatus === 'queued' || resume.parseStatus === 'processing';

              return (
                <li key={resume.id} className="surface-panel p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {fileKind(resume.mimeType)}
                        </span>
                        {resume.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            <Star className="h-3 w-3" />
                            Primary
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                            badge.className,
                          )}
                        >
                          {(isParsing || parsing) && <Spinner size="sm" label="Parsing" />}
                          {badge.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(resume.fileSize)} · {formatDate(resume.updatedAt)}
                          {(resume.versions?.filter((v) => v.source === 'optimized').length ?? 0) >
                            0 &&
                            ` · ${resume.versions!.filter((v) => v.source === 'optimized').length} optimized`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={titleDrafts[resume.id] ?? resume.title}
                          onChange={(e) =>
                            setTitleDrafts((prev) => ({ ...prev, [resume.id]: e.target.value }))
                          }
                          aria-label="Resume title"
                          className="max-w-md"
                          disabled={rowBusy}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-[100px]"
                          disabled={
                            rowBusy || titleDrafts[resume.id]?.trim() === resume.title
                          }
                          onClick={() => void saveTitle(resume.id)}
                        >
                          {savingTitle ? <Spinner label="Saving title" /> : 'Save title'}
                        </Button>
                      </div>

                      <p className="truncate text-sm text-muted-foreground">
                        {resume.originalFileName}
                      </p>

                      {resume.parseStatus === 'failed' && resume.parseError && (
                        <p className="text-sm text-destructive">{resume.parseError}</p>
                      )}

                      {resume.parseStatus === 'ready' && parsed && (
                        <div className="rounded-lg border border-border/80 bg-card/40 p-3">
                          {parsed.headline && (
                            <p className="text-sm font-medium text-foreground">{parsed.headline}</p>
                          )}
                          {parsed.summary && (
                            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                              {parsed.summary}
                            </p>
                          )}
                          {!!parsed.skills?.length && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {parsed.skills.slice(0, 12).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {skill}
                                </span>
                              ))}
                              {parsed.skills.length > 12 && (
                                <span className="text-xs text-muted-foreground">
                                  +{parsed.skills.length - 12} more
                                </span>
                              )}
                            </div>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {describeParseSource(parsed)}
                            {parsed.llm?.model && parsed.llm.used ? ` · ${parsed.llm.model}` : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!resume.isPrimary && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-[132px]"
                          disabled={rowBusy}
                          onClick={() => void makePrimary(resume.id)}
                        >
                          {settingPrimary ? (
                            <Spinner label="Setting primary resume" />
                          ) : (
                            <>
                              <Star className="h-4 w-4" />
                              Make primary
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-[110px]"
                        disabled={rowBusy || isParsing}
                        onClick={() => void reparse(resume.id)}
                      >
                        {parsing ? (
                          <Spinner label="Parsing resume" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            {resume.parseStatus === 'ready' ? 'Re-parse' : 'Parse'}
                          </>
                        )}
                      </Button>
                      {resume.parseStatus === 'ready' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-[140px]"
                          disabled={rowBusy}
                          onClick={() => void applyParsed(resume.id)}
                        >
                          {applying ? (
                            <Spinner label="Applying to profile" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Apply to profile
                            </>
                          )}
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <a href={resumeDownloadUrl(resume.id)}>
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                      <Tooltip content="Delete resume">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete resume"
                          disabled={rowBusy}
                          onClick={() => void remove(resume.id)}
                        >
                          {deleting ? (
                            <Spinner label="Deleting resume" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
