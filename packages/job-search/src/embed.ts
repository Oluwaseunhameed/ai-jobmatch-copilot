import { prisma } from '@jobmatch/database';

import { createLogger, type StructuredLogger } from './logger';

export type JobEmbedTrigger = 'seed' | 'manual' | 'backfill' | 'retry';

export type EmbedResponse = {
  model: string;
  dimensions: number;
  transport: string;
  durationMs: number;
  embeddings: number[][];
};

export function aiServiceUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function embedTimeoutMs() {
  const raw = Number(process.env.EMBEDDING_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

export class EmbeddingUnavailableError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'EmbeddingUnavailableError';
    this.retryable = retryable;
  }
}

/** Call the AI service. Throws EmbeddingUnavailableError so callers can degrade. */
export async function embedTexts(texts: string[]): Promise<EmbedResponse> {
  let response: Response;

  try {
    response = await fetch(`${aiServiceUrl()}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(embedTimeoutMs()),
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new EmbeddingUnavailableError(
      `Could not reach the AI service at ${aiServiceUrl()} (${reason}). ` +
        'Start it with "pnpm dev:ai", or run "pnpm dev" to start everything.',
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    const detail = body?.detail || `The AI service returned ${response.status}.`;
    // 400 means the request itself is wrong; retrying will not change that.
    throw new EmbeddingUnavailableError(detail, response.status !== 400);
  }

  const body = (await response.json().catch(() => null)) as Partial<EmbedResponse> | null;

  if (!body || !Array.isArray(body.embeddings) || body.embeddings.length === 0) {
    throw new EmbeddingUnavailableError('The AI service returned no embeddings.');
  }

  return {
    model: typeof body.model === 'string' ? body.model : '',
    dimensions: typeof body.dimensions === 'number' ? body.dimensions : 0,
    transport: typeof body.transport === 'string' ? body.transport : '',
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : 0,
    embeddings: body.embeddings,
  };
}

/** Embed a search query. Returns null when embeddings are unavailable. */
export async function embedQuery(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;

  try {
    const result = await embedTexts([text]);
    return result.embeddings[0] ?? null;
  } catch {
    // Callers fall back to keyword search; the reason is surfaced by searchJobs.
    return null;
  }
}

/**
 * The text we embed for a posting.
 *
 * Deliberately excludes benefits and boilerplate: they are near-identical across
 * postings and dilute the signal that distinguishes one job from another.
 */
export function jobEmbeddingText(job: {
  title: string;
  seniority: string;
  employmentType: string;
  workMode: string;
  location: string | null;
  skills: string[];
  description: string;
  requirements: string[];
  company: { name: string; industry: string | null };
}): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company.name}${job.company.industry ? ` (${job.company.industry})` : ''}`,
    `Seniority: ${job.seniority}`,
    `Employment: ${job.employmentType}, ${job.workMode}`,
    job.location ? `Location: ${job.location}` : '',
    job.skills.length ? `Skills: ${job.skills.join(', ')}` : '',
    job.requirements.length ? `Requirements: ${job.requirements.join(' ')}` : '',
    job.description,
  ]
    .filter(Boolean)
    .join('\n');
}

/** pgvector's text input format. */
function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export type EmbedJobInput = {
  jobId: string;
  trigger: JobEmbedTrigger;
  attempt?: number;
  maxAttempts?: number;
  logger?: StructuredLogger;
};

/**
 * Embed a single posting and persist the vector.
 *
 * Mirrors resume parsing: terminal state is recorded before throwing, so a row is
 * never left claiming to be processing after the worker gives up.
 */
export async function embedJob(input: EmbedJobInput) {
  const {
    jobId,
    trigger,
    attempt = 1,
    maxAttempts = 1,
    logger = createLogger('job-search'),
  } = input;

  const base = { jobId, trigger, attempt, maxAttempts };
  const startedAt = Date.now();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      seniority: true,
      employmentType: true,
      workMode: true,
      location: true,
      skills: true,
      description: true,
      requirements: true,
      company: { select: { name: true, industry: true } },
    },
  });

  if (!job) {
    logger.log('warn', 'embed.skipped', { ...base, reason: 'job_missing' });
    throw new EmbeddingUnavailableError('Job not found', false);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { embeddingStatus: 'processing', embeddingError: null },
  });

  try {
    const result = await embedTexts([jobEmbeddingText(job)]);
    const vector = result.embeddings[0];

    if (!vector?.length) {
      throw new EmbeddingUnavailableError('The AI service returned an empty vector.');
    }

    // pgvector columns are not representable in the Prisma client, so the vector
    // is written with raw SQL while the status fields go through Prisma.
    await prisma.$executeRawUnsafe(
      `UPDATE "jobs"
         SET "embedding" = $1::vector,
             "embedding_status" = 'ready',
             "embedding_error" = NULL,
             "embedding_model" = $2,
             "embedded_at" = NOW(),
             "updated_at" = NOW()
       WHERE "id" = $3`,
      toVectorLiteral(vector),
      result.model,
      jobId,
    );

    logger.log('info', 'embed.succeeded', {
      ...base,
      durationMs: Date.now() - startedAt,
      model: result.model,
      transport: result.transport,
      dimensions: result.dimensions,
    });

    return { jobId, model: result.model, dimensions: result.dimensions };
  } catch (cause) {
    const retryable = cause instanceof EmbeddingUnavailableError ? cause.retryable : true;
    const message = cause instanceof Error ? cause.message : String(cause);
    const willRetry = retryable && attempt < maxAttempts;

    await prisma.job
      .update({
        where: { id: jobId },
        data: {
          embeddingStatus: willRetry ? 'queued' : 'failed',
          embeddingError: message.slice(0, 500),
        },
      })
      .catch(() => undefined);

    logger.log(willRetry ? 'warn' : 'error', 'embed.failed', {
      ...base,
      durationMs: Date.now() - startedAt,
      retryable,
      willRetry,
      message,
    });

    throw cause;
  }
}

/** Ids of postings that still need a vector, oldest first. */
export async function jobsNeedingEmbedding(limit = 200): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: { isActive: true, embeddingStatus: { in: ['idle', 'failed'] } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  });

  return rows.map((row) => row.id);
}
