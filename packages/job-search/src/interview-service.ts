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
import { aiServiceUrl } from './embed';

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
      answer: entry.answer?.trim() ? entry.answer.trim().slice(0, 4_000) : null,
      feedback: entry.feedback?.trim() ? entry.feedback.trim().slice(0, 2_000) : null,
      followUp: entry.followUp?.trim() ? entry.followUp.trim().slice(0, 500) : null,
      feedbackSource: entry.feedbackSource ?? null,
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

export async function runInterviewMockTurn(input: {
  userId: string;
  id: string;
  questionId: string;
  answer: string;
  selfRating?: number;
}): Promise<InterviewPrepDto | null> {
  const existing = await prisma.interviewPrep.findFirst({
    where: { id: input.id, userId: input.userId },
    include: prepInclude,
  });
  if (!existing) return null;

  const questions = Array.isArray(existing.questionsJson)
    ? (existing.questionsJson as unknown as InterviewPrepDto['questions'])
    : [];
  const question = questions.find((q) => q.id === input.questionId);
  if (!question) throw new Error('Question not found in this prep');

  const answer = input.answer.trim().slice(0, 4_000);
  if (!answer) throw new Error('Answer is required');

  const practice = normalizePractice(
    Array.isArray(existing.practiceJson)
      ? (existing.practiceJson as unknown as InterviewPracticeEntryDto[])
      : [],
  );

  const turn = await callInterviewMockTurn({
    question: question.prompt,
    category: String(question.category ?? 'behavioral'),
    answer,
    jobTitle: existing.job?.title ?? '',
    companyName: existing.job?.company.name ?? '',
  });

  const rating =
    input.selfRating != null
      ? Math.min(5, Math.max(1, Math.round(Number(input.selfRating))))
      : practice.find((p) => p.questionId === input.questionId)?.selfRating ?? 3;

  const nextEntry: InterviewPracticeEntryDto = {
    questionId: input.questionId,
    selfRating: rating,
    notes: practice.find((p) => p.questionId === input.questionId)?.notes ?? null,
    answer,
    feedback: turn.feedback,
    followUp: turn.followUp,
    feedbackSource: turn.source,
  };

  const merged = normalizePractice([
    ...practice.filter((p) => p.questionId !== input.questionId),
    nextEntry,
  ]);
  const confidenceScore = computeConfidenceScore(questions, merged);
  const status = interviewPrepStatus(questions, merged);

  const row = await prisma.interviewPrep.update({
    where: { id: existing.id },
    data: {
      practiceJson: merged as unknown as Prisma.InputJsonValue,
      confidenceScore,
      status,
      source: turn.source === 'llm' ? 'llm' : existing.source,
    },
    include: prepInclude,
  });

  return toInterviewPrepDto(row);
}

async function callInterviewMockTurn(input: {
  question: string;
  category: string;
  answer: string;
  jobTitle: string;
  companyName: string;
}): Promise<{ feedback: string; followUp: string; source: string }> {
  const timeout = Number(process.env.AI_SERVICE_INTERVIEW_TIMEOUT_MS) || 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${aiServiceUrl()}/v1/interview/mock-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: input.question,
        category: input.category,
        answer: input.answer,
        job_title: input.jobTitle,
        company_name: input.companyName,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('ai_unavailable');
    const data = (await response.json()) as {
      feedback?: string;
      followUp?: string;
      source?: string;
    };
    return {
      feedback: data.feedback?.trim() || 'Thanks — keep refining with a clearer result metric.',
      followUp: data.followUp?.trim() || 'What would you do differently next time?',
      source: data.source === 'llm' ? 'llm' : 'template',
    };
  } catch {
    const words = input.answer.split(/\s+/).filter(Boolean).length;
    return {
      feedback:
        words < 20
          ? 'Your answer is short — expand with situation, action, and a measurable result.'
          : 'Solid draft. Tighten the ending with impact and one lesson learned.',
      followUp: `For ${input.jobTitle || 'this role'}, what would you do differently next time?`,
      source: 'template',
    };
  } finally {
    clearTimeout(timer);
  }
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
