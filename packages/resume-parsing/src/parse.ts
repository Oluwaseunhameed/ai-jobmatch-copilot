import { prisma, type Prisma } from '@jobmatch/database';
import { getObjectBuffer, type StorageProviderName } from '@jobmatch/storage';

import { ResumeParseError, classifyParseError } from './errors';
import { createLogger, type StructuredLogger } from './logger';

const PARSED_VERSION_LABEL = 'Parsed extract';

export type ResumeParseTrigger = 'upload' | 'manual' | 'retry';

/** Enrichment metadata reported by the AI service, persisted for observability. */
export type LlmMetadata = {
  enabled: boolean;
  used: boolean;
  model: string | null;
  error: string | null;
};

export type AiParseResponse = {
  file_name: string;
  mime_type: string;
  file_size: number;
  text: string;
  skills: string[];
  headline: string | null;
  summary: string | null;
  emails: string[];
  phones: string[];
  links: string[];
  city?: string | null;
  country?: string | null;
  experience?: Array<{
    title: string;
    company: string;
    location?: string | null;
    startMonth?: string | null;
    endMonth?: string | null;
    isCurrent?: boolean;
    description?: string | null;
    highlights?: string[];
  }>;
  education?: Array<{
    school: string;
    degree?: string | null;
    field?: string | null;
    startYear?: number | null;
    endYear?: number | null;
    description?: string | null;
  }>;
  source: string;
  status: string;
  llm?: LlmMetadata;
};

export type ParseResumeInput = {
  userId: string;
  resumeId: string;
  trigger: ResumeParseTrigger;
  /** 1-based attempt number, supplied by the queue worker. */
  attempt?: number;
  maxAttempts?: number;
  logger?: StructuredLogger;
};

export function aiServiceUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function aiTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  // Generous by default: LLM enrichment is far slower than heuristic extraction.
  return Number.isFinite(raw) && raw > 0 ? raw : 120_000;
}

/**
 * Parse a resume and persist the result.
 *
 * Records terminal state in the database before throwing, so the caller may retry
 * without the row ever being left in a lying state. Retryable failures leave the
 * resume `queued`; final failures leave it `failed` with a user-facing message.
 */
export async function parseResume(input: ParseResumeInput) {
  const {
    userId,
    resumeId,
    trigger,
    attempt = 1,
    maxAttempts = 1,
    logger = createLogger('resume-parsing'),
  } = input;

  const base = { resumeId, userId, trigger, attempt, maxAttempts };
  const startedAt = Date.now();

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) {
    // Deleted between enqueue and execution — nothing to record, nothing to retry.
    const error = new ResumeParseError('resume_missing', 'Resume not found');
    logger.log('warn', 'parse.skipped', { ...base, kind: error.kind });
    throw error;
  }

  logger.log('info', 'parse.started', { ...base, fileSize: resume.fileSize });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { parseStatus: 'processing', parseError: null },
  });

  try {
    const buffer = await getObjectBuffer(
      resume.storageKey,
      resume.storageProvider as StorageProviderName,
    );

    const parsed = await callAiService({
      buffer,
      fileName: resume.originalFileName,
      mimeType: resume.mimeType,
      title: resume.title,
    });

    const updated = await persistResult(resumeId, parsed);
    const llm = parsed.llm;

    logger.log('info', 'parse.succeeded', {
      ...base,
      durationMs: Date.now() - startedAt,
      textLength: parsed.text.length,
      skillCount: parsed.skills.length,
      source: parsed.source,
      llmUsed: llm?.used ?? false,
      llmModel: llm?.model ?? null,
      llmError: llm?.error ?? null,
    });

    return updated;
  } catch (cause) {
    const error = classifyParseError(cause, aiServiceUrl());
    const willRetry = error.retryable && attempt < maxAttempts;

    await prisma.resume
      .update({
        where: { id: resumeId },
        data: {
          // Staying `queued` communicates "a retry is coming" rather than "give up".
          parseStatus: willRetry ? 'queued' : 'failed',
          parseError: error.message.slice(0, 500),
        },
      })
      .catch(() => undefined);

    logger.log(willRetry ? 'warn' : 'error', 'parse.failed', {
      ...base,
      durationMs: Date.now() - startedAt,
      kind: error.kind,
      retryable: error.retryable,
      willRetry,
      message: error.message,
    });

    throw error;
  }
}

async function callAiService(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  title: string;
}): Promise<AiParseResponse> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.buffer)], { type: input.mimeType });
  form.append('file', blob, input.fileName);
  form.append('title', input.title);

  const response = await fetch(`${aiServiceUrl()}/v1/resumes/parse`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(aiTimeoutMs()),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);

    // 4xx means the file itself is the problem, so retrying cannot help.
    if (response.status >= 400 && response.status < 500) {
      throw new ResumeParseError('ai_rejected_file', detail);
    }

    throw new ResumeParseError('ai_error', detail);
  }

  const body: unknown = await response.json().catch(() => null);
  return assertAiResponse(body);
}

async function readErrorDetail(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    detail?: string | { msg?: string }[];
  } | null;

  const detail = body?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const joined = detail
      .map((item) => item?.msg)
      .filter((msg): msg is string => Boolean(msg))
      .join('; ');
    if (joined) return joined;
  }

  return `The AI service returned ${response.status}.`;
}

/** Guard the boundary: a malformed AI response must not be written to the database. */
function assertAiResponse(body: unknown): AiParseResponse {
  if (!body || typeof body !== 'object') {
    throw new ResumeParseError('invalid_ai_response', 'The AI service returned an unreadable response.');
  }

  const candidate = body as Partial<AiParseResponse>;

  if (typeof candidate.text !== 'string') {
    throw new ResumeParseError('invalid_ai_response', 'The AI service response was missing extracted text.');
  }

  const stringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const nullableString = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value : null;

  return {
    file_name: typeof candidate.file_name === 'string' ? candidate.file_name : '',
    mime_type: typeof candidate.mime_type === 'string' ? candidate.mime_type : '',
    file_size: typeof candidate.file_size === 'number' ? candidate.file_size : 0,
    text: candidate.text,
    skills: stringArray(candidate.skills),
    headline: nullableString(candidate.headline),
    summary: nullableString(candidate.summary),
    emails: stringArray(candidate.emails),
    phones: stringArray(candidate.phones),
    links: stringArray(candidate.links),
    city: nullableString(candidate.city),
    country: nullableString(candidate.country),
    experience: Array.isArray(candidate.experience)
      ? candidate.experience
          .filter(
            (item): item is NonNullable<AiParseResponse['experience']>[number] =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  typeof (item as { title?: unknown }).title === 'string' &&
                  typeof (item as { company?: unknown }).company === 'string',
              ),
          )
          .slice(0, 8)
      : [],
    education: Array.isArray(candidate.education)
      ? candidate.education
          .filter(
            (item): item is NonNullable<AiParseResponse['education']>[number] =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  typeof (item as { school?: unknown }).school === 'string',
              ),
          )
          .slice(0, 6)
      : [],
    source: typeof candidate.source === 'string' ? candidate.source : 'heuristic',
    status: typeof candidate.status === 'string' ? candidate.status : 'ready',
    llm: normalizeLlmMetadata(candidate.llm),
  };
}

function normalizeLlmMetadata(value: unknown): LlmMetadata {
  const raw = (value ?? {}) as Partial<LlmMetadata>;
  return {
    enabled: raw.enabled === true,
    used: raw.used === true,
    model: typeof raw.model === 'string' ? raw.model : null,
    error: typeof raw.error === 'string' ? raw.error : null,
  };
}

async function persistResult(resumeId: string, parsed: AiParseResponse) {
  const parsedJson = {
    headline: parsed.headline,
    summary: parsed.summary,
    skills: parsed.skills,
    emails: parsed.emails,
    phones: parsed.phones,
    links: parsed.links,
    city: parsed.city ?? null,
    country: parsed.country ?? null,
    experience: parsed.experience ?? [],
    education: parsed.education ?? [],
    source: parsed.source,
    status: parsed.status,
    llm: parsed.llm,
    parsedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonObject;

  // Only snapshot a new version when the extracted text actually changed, so
  // repeated re-parses do not bloat the version history with identical rows.
  const latestParsed = await prisma.resumeVersion.findFirst({
    where: { resumeId, label: PARSED_VERSION_LABEL },
    orderBy: { createdAt: 'desc' },
    select: { contentText: true },
  });

  const textChanged = latestParsed?.contentText !== parsed.text;

  return prisma.resume.update({
    where: { id: resumeId },
    data: {
      parseStatus: 'ready',
      parseError: null,
      parsedText: parsed.text,
      parsedJson,
      ...(textChanged
        ? {
            versions: {
              create: {
                label: PARSED_VERSION_LABEL,
                source: 'upload',
                contentText: parsed.text,
                contentJson: {
                  headline: parsed.headline,
                  summary: parsed.summary,
                  skills: parsed.skills,
                } satisfies Prisma.InputJsonObject,
              },
            },
          }
        : {}),
    },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });
}
