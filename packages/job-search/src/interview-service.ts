import { prisma, type Prisma } from '@jobmatch/database';
import type {
  InterviewPracticeEntryDto,
  InterviewPrepDto,
  InterviewQuestionCategory,
} from '@jobmatch/types';
import { isInterviewQuestionCategory } from '@jobmatch/types';

import {
  buildInterviewQuestions,
  computeConfidenceScore,
  interviewPrepStatus,
  toInterviewPrepDto,
  type InterviewJobInput,
} from './interview';

export {
  buildInterviewQuestions,
  computeConfidenceScore,
  inferInterviewCategories,
  interviewPrepStatus,
  toInterviewPrepDto,
  type InterviewJobInput,
  type InterviewProfileInput,
} from './interview';

const prepInclude = {
  job: { include: { company: { select: { name: true } } } },
} satisfies Prisma.InterviewPrepInclude;

function normalizePractice(entries: InterviewPracticeEntryDto[]): InterviewPracticeEntryDto[] {
  const byId = new Map<string, InterviewPracticeEntryDto>();
  for (const entry of entries) {
    if (!entry?.questionId) continue;
    const rating = Math.round(Number(entry.selfRating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;
    byId.set(entry.questionId, {
      questionId: entry.questionId,
      selfRating: rating,
      notes: entry.notes?.trim() ? entry.notes.trim() : null,
    });
  }
  return [...byId.values()];
}

export async function createInterviewPrep(input: {
  userId: string;
  jobId: string;
  categories?: string[];
}): Promise<InterviewPrepDto> {
  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    include: { company: true },
  });
  if (!job || !job.isActive) {
    throw new Error('Job not found');
  }

  const categories = input.categories
    ?.map((c) => c.trim())
    .filter(isInterviewQuestionCategory) as InterviewQuestionCategory[] | undefined;

  const jobInput: InterviewJobInput = {
    id: job.id,
    title: job.title,
    skills: job.skills,
    seniority: job.seniority,
    description: job.description,
    companyName: job.company.name,
  };

  const built = buildInterviewQuestions(jobInput, categories);

  const row = await prisma.interviewPrep.create({
    data: {
      userId: input.userId,
      jobId: job.id,
      status: 'ready',
      categories: built.categories,
      questionsJson: built.questions as unknown as Prisma.InputJsonValue,
      practiceJson: [] as unknown as Prisma.InputJsonValue,
      confidenceScore: null,
      summary: built.summary,
      source: 'template',
    },
    include: prepInclude,
  });

  return toInterviewPrepDto(row);
}

export async function listInterviewPreps(userId: string): Promise<InterviewPrepDto[]> {
  const rows = await prisma.interviewPrep.findMany({
    where: { userId },
    include: prepInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map(toInterviewPrepDto);
}

export async function getInterviewPrep(
  userId: string,
  id: string,
): Promise<InterviewPrepDto | null> {
  const row = await prisma.interviewPrep.findFirst({
    where: { id, userId },
    include: prepInclude,
  });
  return row ? toInterviewPrepDto(row) : null;
}

export async function getLatestInterviewPrepForJob(
  userId: string,
  jobId: string,
): Promise<InterviewPrepDto | null> {
  const row = await prisma.interviewPrep.findFirst({
    where: { userId, jobId },
    include: prepInclude,
    orderBy: { createdAt: 'desc' },
  });
  return row ? toInterviewPrepDto(row) : null;
}

export async function updateInterviewPractice(input: {
  userId: string;
  id: string;
  practice: InterviewPracticeEntryDto[];
}): Promise<InterviewPrepDto | null> {
  const existing = await prisma.interviewPrep.findFirst({
    where: { id: input.id, userId: input.userId },
  });
  if (!existing) return null;

  const questions = Array.isArray(existing.questionsJson)
    ? (existing.questionsJson as unknown as InterviewPrepDto['questions'])
    : [];
  const practice = normalizePractice(input.practice);
  const confidenceScore = computeConfidenceScore(questions, practice);
  const status = interviewPrepStatus(questions, practice);

  const row = await prisma.interviewPrep.update({
    where: { id: existing.id },
    data: {
      practiceJson: practice as unknown as Prisma.InputJsonValue,
      confidenceScore,
      status,
    },
    include: prepInclude,
  });

  return toInterviewPrepDto(row);
}

export async function deleteInterviewPrep(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.interviewPrep.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.interviewPrep.delete({ where: { id: existing.id } });
  return true;
}
