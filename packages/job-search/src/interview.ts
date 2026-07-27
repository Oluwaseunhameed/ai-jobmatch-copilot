import type {
  InterviewPracticeEntryDto,
  InterviewPrepDto,
  InterviewQuestionCategory,
  InterviewQuestionDto,
} from '@jobmatch/types';
import {
  INTERVIEW_CATEGORY_LABELS,
  INTERVIEW_QUESTION_CATEGORIES,
  isInterviewQuestionCategory,
} from '@jobmatch/types';

export type InterviewJobInput = {
  id: string;
  title: string;
  skills: string[];
  seniority: string;
  description?: string;
  companyName?: string;
};

export type InterviewProfileInput = {
  yearsOfExperience?: number | null;
  desiredRoles?: string[];
  currentJobTitle?: string | null;
  skills: Array<{ name: string }>;
};

type BankItem = Omit<InterviewQuestionDto, 'id'> & { key: string };

const BANK: BankItem[] = [
  {
    key: 'beh-star',
    category: 'behavioral',
    prompt: 'Tell me about a time you disagreed with a teammate. How did you resolve it?',
    tip: 'Use STAR (Situation, Task, Action, Result). Emphasize listening and a concrete outcome.',
    difficulty: 'easy',
  },
  {
    key: 'beh-fail',
    category: 'behavioral',
    prompt: 'Describe a project that did not go as planned. What did you learn?',
    tip: 'Own the miss without blame. Show what you changed afterward.',
    difficulty: 'medium',
  },
  {
    key: 'beh-priority',
    category: 'behavioral',
    prompt: 'How do you prioritize when everything feels urgent?',
    tip: 'Mention impact, deadlines, stakeholders, and how you communicate trade-offs.',
    difficulty: 'medium',
  },
  {
    key: 'beh-lead',
    category: 'behavioral',
    prompt: 'Give an example of mentoring or unblocking someone else.',
    tip: 'Highlight teaching moments and measurable improvement for the other person.',
    difficulty: 'hard',
  },
  {
    key: 'tech-tradeoffs',
    category: 'technical',
    prompt: 'Walk through a technical decision you made recently and the trade-offs you considered.',
    tip: 'Name alternatives, constraints (time, scale, team skill), and why you picked the path.',
    difficulty: 'medium',
  },
  {
    key: 'tech-debug',
    category: 'technical',
    prompt: 'How do you approach debugging a production incident?',
    tip: 'Cover triage, observability, rollback vs fix-forward, and postmortem habits.',
    difficulty: 'medium',
  },
  {
    key: 'tech-quality',
    category: 'technical',
    prompt: 'What does “good enough” quality look like for shipping a feature?',
    tip: 'Balance tests, monitoring, rollout strategy, and debt you consciously accept.',
    difficulty: 'easy',
  },
  {
    key: 'code-complexity',
    category: 'coding',
    prompt: 'How would you find the time and space complexity of an algorithm you just wrote?',
    tip: 'Explain Big-O on loops/recursion and memory for intermediate structures.',
    difficulty: 'easy',
  },
  {
    key: 'code-hash',
    category: 'coding',
    prompt: 'When would you choose a hash map vs a sorted structure for lookups?',
    tip: 'Average O(1) vs ordered iteration / range queries; mention collision and memory costs.',
    difficulty: 'medium',
  },
  {
    key: 'code-test',
    category: 'coding',
    prompt: 'How do you test edge cases for a function that processes user input?',
    tip: 'Empty input, unicode, size limits, invalid types, and concurrency if relevant.',
    difficulty: 'medium',
  },
  {
    key: 'sd-url',
    category: 'system_design',
    prompt: 'Design a URL shortener. What are the core components and bottlenecks?',
    tip: 'API, ID generation, storage, redirect path, caching, and write/read skew.',
    difficulty: 'medium',
  },
  {
    key: 'sd-feed',
    category: 'system_design',
    prompt: 'How would you design a notification feed that stays fresh under load?',
    tip: 'Fan-out on write vs read, queues, caching, and idempotent delivery.',
    difficulty: 'hard',
  },
  {
    key: 'sd-scale',
    category: 'system_design',
    prompt: 'What changes when a service grows from thousands to millions of users?',
    tip: 'Horizontal scaling, data partitioning, caching layers, and operational tooling.',
    difficulty: 'hard',
  },
  {
    key: 'db-index',
    category: 'database',
    prompt: 'When would you add an index, and when would you avoid one?',
    tip: 'Read-heavy filters vs write amplification and storage cost.',
    difficulty: 'easy',
  },
  {
    key: 'db-tx',
    category: 'database',
    prompt: 'Explain a time you needed a transaction or stronger consistency.',
    tip: 'Name isolation needs (money, inventory) and what happens on failure.',
    difficulty: 'medium',
  },
  {
    key: 'db-n1',
    category: 'database',
    prompt: 'How do you detect and fix N+1 query problems?',
    tip: 'Logs/APM, eager loading, batching, and denormalization trade-offs.',
    difficulty: 'medium',
  },
  {
    key: 'fe-state',
    category: 'frontend',
    prompt: 'How do you decide between local component state and shared/global state?',
    tip: 'Ownership, update frequency, and whether multiple distant consumers need it.',
    difficulty: 'easy',
  },
  {
    key: 'fe-perf',
    category: 'frontend',
    prompt: 'A page feels slow. How do you diagnose frontend performance?',
    tip: 'Core Web Vitals, bundle size, waterfall, re-renders, and caching.',
    difficulty: 'medium',
  },
  {
    key: 'fe-a11y',
    category: 'frontend',
    prompt: 'What accessibility checks do you run before shipping UI?',
    tip: 'Keyboard nav, labels, contrast, focus order, and screen-reader smoke tests.',
    difficulty: 'medium',
  },
  {
    key: 'be-api',
    category: 'backend',
    prompt: 'How do you design a resilient public API?',
    tip: 'Versioning, auth, idempotency, rate limits, validation, and clear errors.',
    difficulty: 'medium',
  },
  {
    key: 'be-queue',
    category: 'backend',
    prompt: 'When would you move work off the request path onto a queue?',
    tip: 'Latency, retries, fan-out, and failure isolation.',
    difficulty: 'medium',
  },
  {
    key: 'be-auth',
    category: 'backend',
    prompt: 'Compare session cookies vs bearer tokens for a BFF-style app.',
    tip: 'CSRF, storage, revocation, and trust boundaries between web and APIs.',
    difficulty: 'hard',
  },
  {
    key: 'ops-ci',
    category: 'devops',
    prompt: 'What belongs in CI vs CD for a service you own?',
    tip: 'Fast feedback (lint/test) vs progressive delivery, migrations, and rollbacks.',
    difficulty: 'easy',
  },
  {
    key: 'ops-obs',
    category: 'devops',
    prompt: 'Which signals would you alert on for a customer-facing API?',
    tip: 'Error rate, latency SLOs, saturation, and business-critical paths.',
    difficulty: 'medium',
  },
  {
    key: 'ops-k8s',
    category: 'devops',
    prompt: 'How do you roll out a risky config change safely?',
    tip: 'Canaries, feature flags, blast radius, and quick revert plans.',
    difficulty: 'hard',
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function inferInterviewCategories(job: InterviewJobInput): InterviewQuestionCategory[] {
  const text = `${job.title} ${job.skills.join(' ')} ${job.description ?? ''}`.toLowerCase();
  const selected = new Set<InterviewQuestionCategory>(['behavioral', 'technical']);

  if (/react|next|vue|angular|css|frontend|ui/.test(text)) selected.add('frontend');
  if (/node|nest|api|backend|java|go|python|django|rails/.test(text)) selected.add('backend');
  if (/sql|postgres|mysql|mongo|database|prisma/.test(text)) selected.add('database');
  if (/kubernet|docker|devops|sre|terraform|ci\/cd|platform/.test(text)) selected.add('devops');
  if (/architect|distributed|scale|system design|platform/.test(text)) selected.add('system_design');
  if (/algorithm|leetcode|coding|software engineer|developer/.test(text)) selected.add('coding');

  if (['senior', 'lead', 'principal'].includes(job.seniority.toLowerCase())) {
    selected.add('system_design');
  }

  return INTERVIEW_QUESTION_CATEGORIES.filter((c) => selected.has(c));
}

function difficultyForSeniority(seniority: string): Array<'easy' | 'medium' | 'hard'> {
  const key = seniority.toLowerCase();
  if (key === 'intern' || key === 'junior') return ['easy', 'medium'];
  if (key === 'lead' || key === 'principal') return ['medium', 'hard'];
  return ['easy', 'medium', 'hard'];
}

function personalizePrompt(prompt: string, job: InterviewJobInput): string {
  const company = job.companyName?.trim();
  if (!company) return prompt;
  if (/this (role|company|team)/i.test(prompt)) {
    return prompt.replace(/this company/gi, company).replace(/this role/gi, `the ${job.title} role`);
  }
  return prompt;
}

export function buildInterviewQuestions(
  job: InterviewJobInput,
  categories?: InterviewQuestionCategory[],
  limitPerCategory = 3,
): { categories: InterviewQuestionCategory[]; questions: InterviewQuestionDto[]; summary: string } {
  const cats =
    categories?.filter(isInterviewQuestionCategory).length
      ? categories.filter(isInterviewQuestionCategory)
      : inferInterviewCategories(job);

  const allowedDifficulty = new Set(difficultyForSeniority(job.seniority));
  const questions: InterviewQuestionDto[] = [];

  for (const category of cats) {
    const pool = BANK.filter(
      (item) => item.category === category && allowedDifficulty.has(item.difficulty),
    );
    const fallback = BANK.filter((item) => item.category === category);
    const picks = (pool.length ? pool : fallback).slice(0, limitPerCategory);
    for (const item of picks) {
      questions.push({
        id: `${slugify(job.id)}-${item.key}`,
        category: item.category,
        prompt: personalizePrompt(item.prompt, job),
        tip: item.tip,
        difficulty: item.difficulty,
      });
    }
  }

  const company = job.companyName ? ` at ${job.companyName}` : '';
  const labels = cats.map((c) => INTERVIEW_CATEGORY_LABELS[c]).join(', ');
  const summary = `Interview prep for ${job.title}${company}: ${questions.length} questions across ${labels}. Practice aloud, then rate your confidence on each.`;

  return { categories: cats, questions, summary };
}

export function computeConfidenceScore(
  questions: InterviewQuestionDto[],
  practice: InterviewPracticeEntryDto[],
): number | null {
  if (questions.length === 0) return null;
  const byId = new Map(practice.map((p) => [p.questionId, p]));
  let rated = 0;
  let ratingSum = 0;
  for (const q of questions) {
    const entry = byId.get(q.id);
    if (!entry || entry.selfRating < 1) continue;
    rated += 1;
    ratingSum += Math.min(5, Math.max(1, entry.selfRating));
  }
  if (rated === 0) return null;
  const avg = ratingSum / rated; // 1–5
  const coverage = rated / questions.length; // 0–1
  return Math.round((avg / 5) * 70 + coverage * 30);
}

export function interviewPrepStatus(
  questions: InterviewQuestionDto[],
  practice: InterviewPracticeEntryDto[],
): 'ready' | 'practicing' | 'completed' {
  if (practice.length === 0) return 'ready';
  const ratedIds = new Set(practice.filter((p) => p.selfRating >= 1).map((p) => p.questionId));
  if (questions.every((q) => ratedIds.has(q.id))) return 'completed';
  return 'practicing';
}

export function toInterviewPrepDto(row: {
  id: string;
  userId: string;
  jobId: string;
  status: string;
  categories: string[];
  questionsJson: unknown;
  practiceJson: unknown;
  confidenceScore: number | null;
  summary: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  job?: { id: string; title: string; slug: string; company: { name: string } } | null;
}): InterviewPrepDto {
  const questions = Array.isArray(row.questionsJson)
    ? (row.questionsJson as InterviewQuestionDto[])
    : [];
  const practice = Array.isArray(row.practiceJson)
    ? (row.practiceJson as InterviewPracticeEntryDto[])
    : [];

  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    status: row.status,
    categories: row.categories,
    questions,
    practice,
    confidenceScore: row.confidenceScore,
    summary: row.summary,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.job
      ? {
          id: row.job.id,
          title: row.job.title,
          slug: row.job.slug,
          companyName: row.job.company.name,
        }
      : undefined,
  };
}
