import type {
  ApplyAssistSessionDto,
  ApplyAssistStatus,
  ApplyChecklistItemDto,
  ApplyFillAttemptDto,
  ApplyFillFieldDto,
  ApplyPlaywrightStatus,
} from '@jobmatch/types';
import { isApplyAssistStatus } from '@jobmatch/types';

import { isFixtureApplyUrl } from './apply/ats-detect';

export type ApplyAssistContext = {
  applyUrl: string | null;
  resumeLinked: boolean;
  resumeTitle?: string | null;
  draftStatus: string | null;
  coverLetter: string | null;
  answers: Array<{ question: string; answer: string }>;
  candidateName: string | null;
  headline: string | null;
  email: string | null;
  skills: string[];
  jobTitle: string;
  companyName: string;
  jobSource?: string | null;
};

export function normalizeAssistStatus(value?: string | null): ApplyAssistStatus {
  if (value && isApplyAssistStatus(value)) return value;
  return 'ready';
}

export function buildApplyChecklist(ctx: ApplyAssistContext): ApplyChecklistItemDto[] {
  const draftReady = ctx.draftStatus === 'ready';
  const hasLetter = Boolean(ctx.coverLetter?.trim());
  const hasAnswers = ctx.answers.some((a) => a.answer.trim());

  return [
    {
      id: 'resume',
      label: 'Resume linked',
      done: ctx.resumeLinked,
      required: true,
      detail: ctx.resumeLinked
        ? `Using ${ctx.resumeTitle ?? 'linked resume'}`
        : 'Link a resume on the application before applying',
    },
    {
      id: 'draft',
      label: 'Application draft ready',
      done: draftReady,
      required: false,
      detail: draftReady
        ? 'Cover letter / answers draft is ready'
        : 'Generate materials from the job’s Application Assistant (optional but recommended)',
    },
    {
      id: 'cover_letter',
      label: 'Cover letter available',
      done: hasLetter,
      required: false,
      detail: hasLetter ? 'Ready to paste' : 'No cover letter in draft yet',
    },
    {
      id: 'answers',
      label: 'Short answers available',
      done: hasAnswers,
      required: false,
      detail: hasAnswers
        ? `${ctx.answers.filter((a) => a.answer.trim()).length} answer(s) ready`
        : 'No short answers generated yet',
    },
    {
      id: 'apply_url',
      label: 'External apply URL',
      done: Boolean(ctx.applyUrl),
      required: true,
      detail: ctx.applyUrl
        ? 'Public apply / careers link is available'
        : 'This job has no applyUrl — open the source listing manually',
    },
  ];
}

export function buildFillPlan(ctx: ApplyAssistContext): ApplyFillFieldDto[] {
  const fields: ApplyFillFieldDto[] = [];
  const push = (
    id: string,
    label: string,
    value: string | null | undefined,
    source: ApplyFillFieldDto['source'],
    sensitive = false,
  ) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    fields.push({ id, label, value: trimmed.slice(0, 4000), source, sensitive });
  };

  push('full_name', 'Full name', ctx.candidateName, 'profile');
  push('email', 'Email', ctx.email, 'profile', true);
  push('headline', 'Headline', ctx.headline, 'profile');
  push('role', 'Target role', ctx.jobTitle, 'manual');
  push('company', 'Company', ctx.companyName, 'manual');
  if (ctx.skills.length) {
    push('skills', 'Skills', ctx.skills.slice(0, 12).join(', '), 'profile');
  }
  push('cover_letter', 'Cover letter', ctx.coverLetter, 'draft');
  ctx.answers.forEach((answer, index) => {
    if (!answer.answer.trim()) return;
    push(
      `answer_${index + 1}`,
      answer.question.trim() || `Short answer ${index + 1}`,
      answer.answer,
      'draft',
    );
  });

  return fields;
}

export function computeReadinessPct(checklist: ApplyChecklistItemDto[]): number {
  if (checklist.length === 0) return 0;
  const required = checklist.filter((item) => item.required);
  const pool = required.length > 0 ? required : checklist;
  const done = pool.filter((item) => item.done).length;
  return Math.round((done / pool.length) * 100);
}

/**
 * Playwright gate: never auto-submit. Approval only records intent;
 * fill-only adapters run via explicit `run_fill` after approval.
 */
export function evaluatePlaywrightGate(input: {
  fillApproved: boolean;
  applyUrl: string | null;
  allowFixture?: boolean;
  liveFillEnabled?: boolean;
}): { status: ApplyPlaywrightStatus; detail: string } {
  if (!input.fillApproved) {
    return {
      status: 'blocked',
      detail: 'User has not approved the fill plan yet.',
    };
  }

  if (isFixtureApplyUrl(input.applyUrl)) {
    const fixtureEnabled =
      input.allowFixture === true || process.env.APPLY_AUTOMATION_FIXTURE === '1';
    return {
      // Historical: allowFixture marks fixture as ready (fill still via run_fill).
      status: fixtureEnabled ? 'fixture_ran' : 'approved_pending',
      detail: fixtureEnabled
        ? 'Fixture mode: fields may be filled in a local demo form only. Submit remains a manual user action.'
        : 'Fill plan approved. Fixture URL detected — run fill-only assist; Submit remains a manual action.',
    };
  }

  if (input.liveFillEnabled || process.env.APPLY_AUTOMATION_LIVE === '1') {
    return {
      status: 'approved_pending',
      detail:
        'Fill plan approved. Live ATS fill-only is enabled — run assist to fill fields. Never auto-submit; confirm after you submit.',
    };
  }

  return {
    status: 'approved_pending',
    detail:
      'Fill plan approved. Playwright will not submit forms. Open the apply URL and paste fields yourself, then confirm submission.',
  };
}

export function toApplyAssistSessionDto(row: {
  id: string;
  userId: string;
  applicationId: string;
  status: string;
  checklistJson: unknown;
  fillPlanJson: unknown;
  openedAt: Date | null;
  fillApprovedAt: Date | null;
  submittedAt: Date | null;
  submitNote: string | null;
  playwrightStatus: string;
  playwrightDetail: string | null;
  atsVendor?: string | null;
  fillAttemptJson?: unknown;
  createdAt: Date;
  updatedAt: Date;
  application?: {
    job?: {
      id: string;
      title: string;
      slug: string;
      applyUrl: string | null;
      source?: string | null;
      company: { name: string };
    };
  };
}): ApplyAssistSessionDto {
  const checklist = Array.isArray(row.checklistJson)
    ? (row.checklistJson as ApplyChecklistItemDto[])
    : [];
  const fillPlan = Array.isArray(row.fillPlanJson)
    ? (row.fillPlanJson as ApplyFillFieldDto[])
    : [];

  const lastFillAttempt =
    row.fillAttemptJson && typeof row.fillAttemptJson === 'object'
      ? (row.fillAttemptJson as ApplyFillAttemptDto)
      : null;

  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
    status: row.status,
    checklist,
    fillPlan,
    readinessPct: computeReadinessPct(checklist),
    applyUrl: row.application?.job?.applyUrl ?? null,
    atsVendor: row.atsVendor ?? null,
    openedAt: row.openedAt?.toISOString() ?? null,
    fillApprovedAt: row.fillApprovedAt?.toISOString() ?? null,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    submitNote: row.submitNote,
    playwrightStatus: row.playwrightStatus,
    playwrightDetail: row.playwrightDetail,
    lastFillAttempt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.application?.job
      ? {
          id: row.application.job.id,
          title: row.application.job.title,
          slug: row.application.job.slug,
          companyName: row.application.job.company.name,
          source: row.application.job.source ?? null,
        }
      : undefined,
  };
}
