import { prisma, type Prisma } from '@jobmatch/database';
import type {
  CodingAttemptDto,
  CodingDifficulty,
  CodingPracticeSessionDto,
  CodingProblemStyle,
} from '@jobmatch/types';
import { isCodingDifficulty, isCodingProblemStyle } from '@jobmatch/types';

import {
  buildCodingPack,
  codingSessionStatus,
  computeCodingPerformance,
  toCodingSessionDto,
  type CodingJobInput,
} from './coding';
import { aiServiceUrl } from './embed';

export {
  buildCodingPack,
  codingSessionStatus,
  computeCodingPerformance,
  inferCodingStyles,
  toCodingSessionDto,
  type CodingJobInput,
} from './coding';

const sessionInclude = {
  job: { include: { company: { select: { name: true } } } },
} satisfies Prisma.CodingPracticeSessionInclude;

function normalizeAttempts(entries: CodingAttemptDto[]): CodingAttemptDto[] {
  const byId = new Map<string, CodingAttemptDto>();
  for (const entry of entries) {
    if (!entry?.problemId) continue;
    const status = entry.status;
    if (!['todo', 'attempted', 'solved', 'skipped'].includes(status)) continue;
    const rating =
      entry.selfRating == null
        ? null
        : Math.min(5, Math.max(1, Math.round(Number(entry.selfRating))));
    const minutes =
      entry.minutesSpent == null
        ? null
        : Math.max(0, Math.round(Number(entry.minutesSpent)));
    byId.set(entry.problemId, {
      problemId: entry.problemId,
      status,
      minutesSpent: Number.isFinite(minutes as number) ? minutes : null,
      selfRating: rating != null && Number.isFinite(rating) ? rating : null,
      notes: entry.notes?.trim() ? entry.notes.trim() : null,
      code: entry.code?.trim() ? entry.code.trim().slice(0, 8_000) : null,
      review: entry.review?.trim() ? entry.review.trim().slice(0, 3_000) : null,
      reviewSource: entry.reviewSource ?? null,
    });
  }
  return [...byId.values()];
}

export async function createCodingSession(input: {
  userId: string;
  jobId?: string | null;
  styles?: string[];
  difficulties?: string[];
  limit?: number;
}): Promise<CodingPracticeSessionDto> {
  let jobInput: CodingJobInput | null = null;
  let jobId: string | null = null;

  if (input.jobId?.trim()) {
    const job = await prisma.job.findUnique({
      where: { id: input.jobId.trim() },
      include: { company: true },
    });
    if (!job || !job.isActive) throw new Error('Job not found');
    jobId = job.id;
    jobInput = {
      id: job.id,
      title: job.title,
      skills: job.skills,
      seniority: job.seniority,
      companyName: job.company.name,
    };
  }

  const styles = input.styles?.filter(isCodingProblemStyle) as CodingProblemStyle[] | undefined;
  const difficulties = input.difficulties?.filter(isCodingDifficulty) as
    | CodingDifficulty[]
    | undefined;

  const built = buildCodingPack({
    job: jobInput,
    styles,
    difficulties,
    limit: input.limit,
  });

  const row = await prisma.codingPracticeSession.create({
    data: {
      userId: input.userId,
      jobId,
      status: 'ready',
      styles: built.styles,
      difficulties: built.difficulties,
      problemsJson: built.problems as unknown as Prisma.InputJsonValue,
      attemptsJson: [] as unknown as Prisma.InputJsonValue,
      performanceScore: null,
      timeBudgetMinutes: built.timeBudgetMinutes,
      summary: built.summary,
      source: 'template',
    },
    include: sessionInclude,
  });

  return toCodingSessionDto(row);
}

export async function listCodingSessions(userId: string): Promise<CodingPracticeSessionDto[]> {
  const rows = await prisma.codingPracticeSession.findMany({
    where: { userId },
    include: sessionInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map(toCodingSessionDto);
}

export async function getCodingSession(
  userId: string,
  id: string,
): Promise<CodingPracticeSessionDto | null> {
  const row = await prisma.codingPracticeSession.findFirst({
    where: { id, userId },
    include: sessionInclude,
  });
  return row ? toCodingSessionDto(row) : null;
}

export async function getLatestCodingSessionForJob(
  userId: string,
  jobId: string,
): Promise<CodingPracticeSessionDto | null> {
  const row = await prisma.codingPracticeSession.findFirst({
    where: { userId, jobId },
    include: sessionInclude,
    orderBy: { createdAt: 'desc' },
  });
  return row ? toCodingSessionDto(row) : null;
}

export async function updateCodingAttempts(input: {
  userId: string;
  id: string;
  attempts: CodingAttemptDto[];
}): Promise<CodingPracticeSessionDto | null> {
  const existing = await prisma.codingPracticeSession.findFirst({
    where: { id: input.id, userId: input.userId },
  });
  if (!existing) return null;

  const problems = Array.isArray(existing.problemsJson)
    ? (existing.problemsJson as unknown as CodingPracticeSessionDto['problems'])
    : [];
  const attempts = normalizeAttempts(input.attempts);
  const performance = computeCodingPerformance(problems, attempts);
  const status = codingSessionStatus(problems, attempts);

  const row = await prisma.codingPracticeSession.update({
    where: { id: existing.id },
    data: {
      attemptsJson: attempts as unknown as Prisma.InputJsonValue,
      performanceScore: performance.score,
      status,
    },
    include: sessionInclude,
  });

  return toCodingSessionDto(row);
}

export async function runCodingReview(input: {
  userId: string;
  id: string;
  problemId: string;
  code: string;
  language?: string | null;
  status?: CodingAttemptDto['status'];
  selfRating?: number | null;
  minutesSpent?: number | null;
}): Promise<CodingPracticeSessionDto | null> {
  const existing = await prisma.codingPracticeSession.findFirst({
    where: { id: input.id, userId: input.userId },
  });
  if (!existing) return null;

  const problems = Array.isArray(existing.problemsJson)
    ? (existing.problemsJson as unknown as CodingPracticeSessionDto['problems'])
    : [];
  const problem = problems.find((p) => p.id === input.problemId);
  if (!problem) throw new Error('Problem not found in this session');

  const code = input.code.trim().slice(0, 8_000);
  if (!code) throw new Error('Code is required for review');

  const prior = normalizeAttempts(
    Array.isArray(existing.attemptsJson)
      ? (existing.attemptsJson as unknown as CodingAttemptDto[])
      : [],
  );
  const prev = prior.find((a) => a.problemId === input.problemId);

  const review = await callCodingReviewAi({
    title: problem.title,
    prompt: problem.prompt,
    difficulty: String(problem.difficulty),
    style: String(problem.style),
    checklist: problem.reviewChecklist ?? [],
    code,
    language: input.language ?? '',
  });

  const next: CodingAttemptDto = {
    problemId: input.problemId,
    status: input.status ?? prev?.status ?? 'attempted',
    minutesSpent: input.minutesSpent ?? prev?.minutesSpent ?? null,
    selfRating: input.selfRating ?? prev?.selfRating ?? null,
    notes: prev?.notes ?? null,
    code,
    review: review.review,
    reviewSource: review.source,
  };

  const attempts = normalizeAttempts([
    ...prior.filter((a) => a.problemId !== input.problemId),
    next,
  ]);
  const performance = computeCodingPerformance(problems, attempts);
  const status = codingSessionStatus(problems, attempts);

  const row = await prisma.codingPracticeSession.update({
    where: { id: existing.id },
    data: {
      attemptsJson: attempts as unknown as Prisma.InputJsonValue,
      performanceScore: performance.score,
      status,
      source: review.source === 'llm' ? 'llm' : existing.source,
    },
    include: sessionInclude,
  });

  return toCodingSessionDto(row);
}

async function callCodingReviewAi(input: {
  title: string;
  prompt: string;
  difficulty: string;
  style: string;
  checklist: string[];
  code: string;
  language: string;
}): Promise<{ review: string; source: string }> {
  const timeout = Number(process.env.AI_SERVICE_CODING_TIMEOUT_MS) || 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${aiServiceUrl()}/v1/coding/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: input.title,
        prompt: input.prompt,
        difficulty: input.difficulty,
        style: input.style,
        checklist: input.checklist,
        code: input.code,
        language: input.language,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('ai_unavailable');
    const data = (await response.json()) as { review?: string; source?: string };
    return {
      review: data.review?.trim() || 'Review unavailable — use the checklist below.',
      source: data.source === 'llm' ? 'llm' : 'template',
    };
  } catch {
    const bullets = (input.checklist.slice(0, 5).map((c) => `- ${c}`).join('\n') ||
      '- Edge cases\n- Complexity');
    return {
      review: `Static review for “${input.title}”:\n${bullets}\n(No code execution — template fallback.)`,
      source: 'template',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteCodingSession(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.codingPracticeSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.codingPracticeSession.delete({ where: { id: existing.id } });
  return true;
}
