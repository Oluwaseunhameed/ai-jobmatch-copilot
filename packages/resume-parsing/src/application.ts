import { prisma, type Prisma } from '@jobmatch/database';

import { createLogger, type StructuredLogger } from './logger';
import { aiServiceUrl } from './parse';

export type ApplicationGenerateTrigger = 'manual' | 'retry';

export type ApplicationAnswer = {
  question: string;
  answer: string;
};

export type AiApplicationResponse = {
  coverLetter: string;
  answers: ApplicationAnswer[];
  questions: string[];
  source: string;
  llm?: {
    enabled: boolean;
    used: boolean;
    model: string | null;
    error: string | null;
    durationMs?: number | null;
  };
};

export type RunApplicationGenerateInput = {
  draftId: string;
  userId: string;
  trigger: ApplicationGenerateTrigger;
  attempt?: number;
  maxAttempts?: number;
  logger?: StructuredLogger;
};

function applicationTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_APPLICATION_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const fallback = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  return Number.isFinite(fallback) && fallback > 0 ? Math.max(fallback, 240_000) : 240_000;
}

/**
 * Generate cover letter + short answers and persist on ApplicationDraft.
 */
export async function runApplicationGeneration(input: RunApplicationGenerateInput) {
  const {
    draftId,
    userId,
    trigger,
    attempt = 1,
    maxAttempts = 1,
    logger = createLogger('application-generate'),
  } = input;

  const base = { draftId, userId, trigger, attempt, maxAttempts };
  const startedAt = Date.now();

  const row = await prisma.applicationDraft.findFirst({
    where: { id: draftId, userId },
    include: {
      resume: true,
      job: { include: { company: true } },
      user: { select: { name: true } },
    },
  });

  if (!row) {
    logger.log('warn', 'application.skipped', { ...base, reason: 'missing' });
    throw new Error('Application draft not found');
  }

  if (row.resume.parseStatus !== 'ready' || !row.resume.parsedText) {
    await prisma.applicationDraft.update({
      where: { id: draftId },
      data: {
        status: 'failed',
        error: 'Resume must be parsed before generating application materials.',
      },
    });
    throw new Error('Resume not ready');
  }

  await prisma.applicationDraft.update({
    where: { id: draftId },
    data: { status: 'processing', error: null },
  });

  logger.log('info', 'application.started', {
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
    const questions = Array.isArray(row.questions)
      ? (row.questions as unknown[]).filter((q): q is string => typeof q === 'string')
      : [];

    const result = await callApplicationAi({
      resume_text: row.resume.parsedText,
      candidate_name: row.user.name,
      headline: parsed.headline ?? null,
      summary: parsed.summary ?? null,
      skills: parsed.skills ?? [],
      questions,
      job: {
        title: row.job.title,
        company_name: row.job.company.name,
        description: row.job.description,
        skills: row.job.skills,
      },
    });

    const updated = await prisma.applicationDraft.update({
      where: { id: draftId },
      data: {
        status: 'ready',
        error: null,
        coverLetter: result.coverLetter,
        questions: result.questions as unknown as Prisma.InputJsonValue,
        answers: result.answers as unknown as Prisma.InputJsonValue,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
      include: {
        job: { include: { company: true } },
      },
    });

    logger.log('info', 'application.succeeded', {
      ...base,
      durationMs: Date.now() - startedAt,
      source: result.source,
      llmUsed: result.llm?.used ?? false,
    });

    return updated;
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Application generation failed unexpectedly';
    const willRetry = attempt < maxAttempts;

    await prisma.applicationDraft.update({
      where: { id: draftId },
      data: {
        status: willRetry ? 'queued' : 'failed',
        error: willRetry ? null : message.slice(0, 500),
      },
    });

    logger.log('error', 'application.failed', {
      ...base,
      durationMs: Date.now() - startedAt,
      willRetry,
      message,
    });

    throw cause;
  }
}

async function callApplicationAi(body: {
  resume_text: string;
  candidate_name: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  questions: string[];
  job: {
    title: string;
    company_name: string;
    description: string;
    skills: string[];
  };
}): Promise<AiApplicationResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), applicationTimeoutMs());

  try {
    const response = await fetch(`${aiServiceUrl()}/v1/applications/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `AI application generate failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    return (await response.json()) as AiApplicationResponse;
  } finally {
    clearTimeout(timer);
  }
}

export function toApplicationDraftDto(
  row: {
    id: string;
    userId: string;
    resumeId: string;
    jobId: string;
    status: string;
    error: string | null;
    coverLetter: string | null;
    questions: unknown;
    answers: unknown;
    resultJson: unknown;
    createdAt: Date;
    updatedAt: Date;
    job?: { title: string; slug: string; company: { name: string } };
  },
) {
  const result = row.resultJson as AiApplicationResponse | null;
  const answers = Array.isArray(row.answers)
    ? (row.answers as ApplicationAnswer[])
    : (result?.answers ?? []);
  const questions = Array.isArray(row.questions)
    ? (row.questions as string[])
    : (result?.questions ?? []);

  return {
    id: row.id,
    userId: row.userId,
    resumeId: row.resumeId,
    jobId: row.jobId,
    status: row.status,
    error: row.error,
    coverLetter: row.coverLetter ?? result?.coverLetter ?? null,
    questions,
    answers,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.job
      ? {
          title: row.job.title,
          slug: row.job.slug,
          companyName: row.job.company.name,
        }
      : undefined,
    source: result?.source,
    llm: result?.llm,
  };
}
