import { prisma, type Prisma } from '@jobmatch/database';

import { createLogger, type StructuredLogger } from './logger';
import { notifyOptimizationComplete } from './notifications';
import { aiServiceUrl } from './parse';

export type ResumeOptimizeTrigger = 'manual' | 'retry';

export type AtsScoreBlock = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
};

export type OptimizeSnapshot = {
  text: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  atsScore: AtsScoreBlock;
};

export type AiOptimizeResponse = {
  before: OptimizeSnapshot;
  after: OptimizeSnapshot;
  source: string;
  llm?: {
    enabled: boolean;
    used: boolean;
    model: string | null;
    error: string | null;
    durationMs?: number | null;
  };
};

export type RunOptimizeInput = {
  optimizationId: string;
  userId: string;
  trigger: ResumeOptimizeTrigger;
  attempt?: number;
  maxAttempts?: number;
  logger?: StructuredLogger;
};

function optimizeTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_OPTIMIZE_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const fallback = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  // Optimise calls can wait on a cold Ollama model; keep above LLM_OPTIMIZE_TIMEOUT_SECONDS.
  return Number.isFinite(fallback) && fallback > 0 ? Math.max(fallback, 240_000) : 240_000;
}

/**
 * Run a resume↔job optimisation and persist the result.
 *
 * Status is always written before throwing so retries never leave a stuck row.
 */
export async function runResumeOptimization(input: RunOptimizeInput) {
  const {
    optimizationId,
    userId,
    trigger,
    attempt = 1,
    maxAttempts = 1,
    logger = createLogger('resume-optimize'),
  } = input;

  const base = { optimizationId, userId, trigger, attempt, maxAttempts };
  const startedAt = Date.now();

  const row = await prisma.resumeOptimization.findFirst({
    where: { id: optimizationId, userId },
    include: {
      resume: true,
      job: { include: { company: true } },
    },
  });

  if (!row) {
    logger.log('warn', 'optimize.skipped', { ...base, reason: 'missing' });
    throw new Error('Optimization not found');
  }

  if (row.resume.parseStatus !== 'ready' || !row.resume.parsedText) {
    await prisma.resumeOptimization.update({
      where: { id: optimizationId },
      data: {
        status: 'failed',
        error: 'Resume must be parsed before it can be optimised for a job.',
      },
    });
    throw new Error('Resume not ready');
  }

  await prisma.resumeOptimization.update({
    where: { id: optimizationId },
    data: { status: 'processing', error: null },
  });

  logger.log('info', 'optimize.started', {
    ...base,
    resumeId: row.resumeId,
    jobId: row.jobId,
  });

  try {
    const parsed = (row.resume.parsedJson ?? {}) as {
      headline?: string | null;
      summary?: string | null;
      skills?: string[];
    };

    const result = await callOptimizeAi({
      resume_text: row.resume.parsedText,
      headline: parsed.headline ?? null,
      summary: parsed.summary ?? null,
      skills: parsed.skills ?? [],
      job: {
        title: row.job.title,
        description: row.job.description,
        skills: row.job.skills,
        requirements: row.job.requirements,
      },
    });

    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: row.resumeId,
        label: `Optimized for ${row.job.title}`,
        source: 'optimized',
        contentText: result.after.text,
        contentJson: {
          jobId: row.jobId,
          jobTitle: row.job.title,
          companyName: row.job.company.name,
          headline: result.after.headline,
          summary: result.after.summary,
          skills: result.after.skills,
          beforeScore: result.before.atsScore.score,
          afterScore: result.after.atsScore.score,
          matchedKeywords: result.after.atsScore.matchedKeywords,
          missingKeywords: result.after.atsScore.missingKeywords,
          source: result.source,
          llm: result.llm ?? null,
        } satisfies Prisma.InputJsonValue,
      },
    });

    const updated = await prisma.resumeOptimization.update({
      where: { id: optimizationId },
      data: {
        status: 'ready',
        error: null,
        beforeScore: result.before.atsScore.score,
        afterScore: result.after.atsScore.score,
        versionId: version.id,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
      include: {
        job: { include: { company: true } },
        version: true,
      },
    });

    logger.log('info', 'optimize.succeeded', {
      ...base,
      durationMs: Date.now() - startedAt,
      beforeScore: result.before.atsScore.score,
      afterScore: result.after.atsScore.score,
      source: result.source,
      llmUsed: result.llm?.used ?? false,
    });

    void notifyOptimizationComplete({
      userId,
      jobTitle: updated.job.title,
      companyName: updated.job.company.name,
      jobSlug: updated.job.slug,
      beforeScore: result.before.atsScore.score,
      afterScore: result.after.atsScore.score,
      logger,
    });

    return updated;
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Optimisation failed unexpectedly';
    const willRetry = attempt < maxAttempts;

    await prisma.resumeOptimization.update({
      where: { id: optimizationId },
      data: {
        status: willRetry ? 'queued' : 'failed',
        error: willRetry ? null : message.slice(0, 500),
      },
    });

    logger.log('error', 'optimize.failed', {
      ...base,
      durationMs: Date.now() - startedAt,
      willRetry,
      message,
    });

    throw cause;
  }
}

async function callOptimizeAi(body: {
  resume_text: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  job: {
    title: string;
    description: string;
    skills: string[];
    requirements: string[];
  };
}): Promise<AiOptimizeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), optimizeTimeoutMs());

  try {
    const response = await fetch(`${aiServiceUrl()}/v1/resumes/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `AI optimize failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    return (await response.json()) as AiOptimizeResponse;
  } finally {
    clearTimeout(timer);
  }
}

export function toOptimizationDto(
  row: {
    id: string;
    userId: string;
    resumeId: string;
    jobId: string;
    status: string;
    error: string | null;
    beforeScore: number | null;
    afterScore: number | null;
    resultJson: unknown;
    versionId: string | null;
    createdAt: Date;
    updatedAt: Date;
    job?: { title: string; slug: string; company: { name: string } };
    version?: { id: string; label: string; source: string; createdAt: Date } | null;
  },
) {
  const result = row.resultJson as AiOptimizeResponse | null;
  return {
    id: row.id,
    userId: row.userId,
    resumeId: row.resumeId,
    jobId: row.jobId,
    status: row.status,
    error: row.error,
    beforeScore: row.beforeScore,
    afterScore: row.afterScore,
    versionId: row.versionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.job
      ? {
          title: row.job.title,
          slug: row.job.slug,
          companyName: row.job.company.name,
        }
      : undefined,
    version: row.version
      ? {
          id: row.version.id,
          label: row.version.label,
          source: row.version.source,
          createdAt: row.version.createdAt.toISOString(),
        }
      : null,
    before: result?.before,
    after: result?.after,
    source: result?.source,
    llm: result?.llm,
  };
}
