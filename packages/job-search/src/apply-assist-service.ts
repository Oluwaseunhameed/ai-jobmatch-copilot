import { prisma, type Prisma } from '@jobmatch/database';
import type { ApplyAssistSessionDto, ApplyFillAttemptDto } from '@jobmatch/types';

import {
  buildApplyChecklist,
  buildFillPlan,
  evaluatePlaywrightGate,
  normalizeAssistStatus,
  toApplyAssistSessionDto,
  type ApplyAssistContext,
} from './apply-assist';
import { atsVendorLabel, detectAts, isFixtureApplyUrl } from './apply/ats-detect';
import { runAtsFill } from './apply/run-fill';

export {
  buildApplyChecklist,
  buildFillPlan,
  computeReadinessPct,
  evaluatePlaywrightGate,
  toApplyAssistSessionDto,
} from './apply-assist';

const assistInclude = {
  application: {
    include: {
      job: {
        include: {
          company: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.ApplyAssistSessionInclude;

async function isFixtureFlagEnabled(): Promise<boolean> {
  if (process.env.APPLY_AUTOMATION_FIXTURE === '1') return true;
  const row = await prisma.appFeatureFlag.findUnique({
    where: { key: 'apply_automation_fixture' },
  });
  return Boolean(row?.enabled);
}

async function loadContext(userId: string, applicationId: string): Promise<{
  application: {
    id: string;
    stage: string;
    resumeId: string | null;
    draftId: string | null;
    notes: string | null;
    job: {
      id: string;
      title: string;
      slug: string;
      applyUrl: string | null;
      source: string;
      company: { name: string };
    };
    resume: { id: string; title: string } | null;
    draft: {
      id: string;
      status: string;
      coverLetter: string | null;
      answers: unknown;
    } | null;
  };
  ctx: ApplyAssistContext;
} | null> {
  const [application, profile, user] = await Promise.all([
    prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        job: { include: { company: { select: { name: true } } } },
        resume: { select: { id: true, title: true } },
        draft: {
          select: { id: true, status: true, coverLetter: true, answers: true },
        },
      },
    }),
    prisma.careerProfile.findUnique({
      where: { userId },
      include: { skills: { select: { name: true }, take: 12 } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  if (!application) return null;

  const answers = Array.isArray(application.draft?.answers)
    ? (application.draft!.answers as Array<{ question?: string; answer?: string }>)
        .map((a) => ({
          question: String(a.question ?? ''),
          answer: String(a.answer ?? ''),
        }))
        .filter((a) => a.answer.trim())
    : [];

  const ctx: ApplyAssistContext = {
    applyUrl: application.job.applyUrl,
    resumeLinked: Boolean(application.resumeId),
    resumeTitle: application.resume?.title ?? null,
    draftStatus: application.draft?.status ?? null,
    coverLetter: application.draft?.coverLetter ?? null,
    answers,
    candidateName: user?.name ?? null,
    headline: profile?.headline ?? null,
    email: user?.email ?? null,
    skills: profile?.skills.map((s) => s.name) ?? [],
    jobTitle: application.job.title,
    companyName: application.job.company.name,
    jobSource: application.job.source,
  };

  return { application, ctx };
}

export async function getOrCreateApplyAssist(
  userId: string,
  applicationId: string,
): Promise<ApplyAssistSessionDto | null> {
  const loaded = await loadContext(userId, applicationId);
  if (!loaded) return null;

  const checklist = buildApplyChecklist(loaded.ctx);
  const fillPlan = buildFillPlan(loaded.ctx);
  const vendor = detectAts(loaded.ctx.applyUrl, loaded.ctx.jobSource);

  const existing = await prisma.applyAssistSession.findUnique({
    where: { applicationId },
    include: assistInclude,
  });

  if (existing && existing.status === 'submitted') {
    return toApplyAssistSessionDto(existing);
  }

  if (existing) {
    const row = await prisma.applyAssistSession.update({
      where: { id: existing.id },
      data: {
        checklistJson: checklist as unknown as Prisma.InputJsonValue,
        fillPlanJson: fillPlan as unknown as Prisma.InputJsonValue,
        atsVendor: vendor,
        status:
          existing.status === 'cancelled'
            ? 'ready'
            : normalizeAssistStatus(existing.status),
      },
      include: assistInclude,
    });
    return toApplyAssistSessionDto(row);
  }

  const row = await prisma.applyAssistSession.create({
    data: {
      userId,
      applicationId,
      status: 'ready',
      checklistJson: checklist as unknown as Prisma.InputJsonValue,
      fillPlanJson: fillPlan as unknown as Prisma.InputJsonValue,
      atsVendor: vendor,
      playwrightStatus: 'skipped',
      playwrightDetail: 'Awaiting user approval before any browser assist.',
    },
    include: assistInclude,
  });

  return toApplyAssistSessionDto(row);
}

export async function markApplyOpened(
  userId: string,
  applicationId: string,
): Promise<ApplyAssistSessionDto | null> {
  const session = await getOrCreateApplyAssist(userId, applicationId);
  if (!session) return null;
  if (session.status === 'submitted') return session;

  const existing = await prisma.applyAssistSession.findUnique({
    where: { id: session.id },
    select: { openedAt: true },
  });

  const row = await prisma.applyAssistSession.update({
    where: { id: session.id },
    data: {
      status: session.status === 'fill_approved' ? 'fill_approved' : 'opened',
      openedAt: existing?.openedAt ?? new Date(),
    },
    include: assistInclude,
  });
  return toApplyAssistSessionDto(row);
}

export async function approveApplyFillPlan(
  userId: string,
  applicationId: string,
): Promise<ApplyAssistSessionDto | null> {
  const loaded = await loadContext(userId, applicationId);
  if (!loaded) return null;

  const session = await getOrCreateApplyAssist(userId, applicationId);
  if (!session) return null;
  if (session.status === 'submitted') return session;

  const requiredMissing = session.checklist.filter((item) => item.required && !item.done);
  if (requiredMissing.length > 0) {
    throw new Error(
      `Complete required checklist items first: ${requiredMissing.map((i) => i.label).join(', ')}`,
    );
  }

  const allowFixture = await isFixtureFlagEnabled();
  const gate = evaluatePlaywrightGate({
    fillApproved: true,
    applyUrl: loaded.ctx.applyUrl,
    allowFixture,
    liveFillEnabled: process.env.APPLY_AUTOMATION_LIVE === '1',
  });
  const vendor = detectAts(loaded.ctx.applyUrl, loaded.ctx.jobSource);

  const row = await prisma.applyAssistSession.update({
    where: { id: session.id },
    data: {
      status: 'fill_approved',
      fillApprovedAt: new Date(),
      atsVendor: vendor,
      playwrightStatus: gate.status,
      playwrightDetail: gate.detail,
    },
    include: assistInclude,
  });

  return toApplyAssistSessionDto(row);
}

/**
 * Fill-only Playwright assist. Never submits. Requires prior fill-plan approval.
 */
export async function runApplyAssistFill(input: {
  userId: string;
  applicationId: string;
  /** Plan selectors without launching Chromium. */
  dryRun?: boolean;
}): Promise<ApplyAssistSessionDto | null> {
  const loaded = await loadContext(input.userId, input.applicationId);
  if (!loaded) return null;

  const session = await getOrCreateApplyAssist(input.userId, input.applicationId);
  if (!session) return null;
  if (session.status === 'submitted') return session;

  if (session.status !== 'fill_approved' && !session.fillApprovedAt) {
    throw new Error('Approve the fill plan before running browser assist.');
  }

  const applyUrl = loaded.ctx.applyUrl;
  if (!applyUrl) {
    throw new Error('No apply URL on this job — cannot run fill assist.');
  }

  const vendor = detectAts(applyUrl, loaded.ctx.jobSource);
  const allowFixture = await isFixtureFlagEnabled();
  const liveEnabled = process.env.APPLY_AUTOMATION_LIVE === '1';

  if (vendor === 'unknown') {
    throw new Error(
      'ATS vendor unknown — use a Greenhouse/Lever/Ashby/Workable URL, or /apply-fixture for local demo.',
    );
  }

  if (vendor !== 'fixture' && !liveEnabled) {
    // Still allow dry-run planning without live env.
    if (!input.dryRun) {
      throw new Error(
        `${atsVendorLabel(vendor)} live fill requires APPLY_AUTOMATION_LIVE=1 (fill-only; never auto-submit).`,
      );
    }
  }

  // Fixture fill: URL-based fixtures are always allowed; flag/env for explicit enable elsewhere.
  if (vendor === 'fixture' && !isFixtureApplyUrl(applyUrl) && !allowFixture) {
    throw new Error('Enable apply_automation_fixture (admin) or APPLY_AUTOMATION_FIXTURE=1.');
  }

  const attempt: ApplyFillAttemptDto = await runAtsFill({
    applyUrl,
    fillPlan: session.fillPlan,
    vendor,
    dryRun: input.dryRun === true,
    headless: true,
  });

  const playwrightStatus = attempt.ok
    ? vendor === 'fixture'
      ? 'fixture_ran'
      : 'adapter_filled'
    : 'adapter_failed';

  const detail = attempt.ok
    ? `Filled ${attempt.filled.length} field(s) via ${atsVendorLabel(vendor)} (${attempt.browserRan ? 'browser' : 'dry-run'}). Submit remains manual — confirm after you apply.`
    : `Fill assist failed: ${attempt.errors.join('; ') || 'unknown error'}. Paste manually, then confirm submission.`;

  const row = await prisma.applyAssistSession.update({
    where: { id: session.id },
    data: {
      status: 'fill_approved',
      atsVendor: vendor,
      fillAttemptJson: attempt as unknown as Prisma.InputJsonValue,
      playwrightStatus,
      playwrightDetail: detail,
    },
    include: assistInclude,
  });

  return toApplyAssistSessionDto(row);
}

export async function confirmApplySubmitted(input: {
  userId: string;
  applicationId: string;
  submitNote?: string | null;
}): Promise<ApplyAssistSessionDto | null> {
  const loaded = await loadContext(input.userId, input.applicationId);
  if (!loaded) return null;

  const session = await getOrCreateApplyAssist(input.userId, input.applicationId);
  if (!session) return null;

  const note = input.submitNote?.trim().slice(0, 2000) || null;
  const stamp = new Date();

  const keepPw =
    session.playwrightStatus === 'fixture_ran' ||
    session.playwrightStatus === 'adapter_filled' ||
    session.playwrightStatus === 'adapter_failed'
      ? session.playwrightStatus
      : 'skipped';

  const [row] = await prisma.$transaction([
    prisma.applyAssistSession.update({
      where: { id: session.id },
      data: {
        status: 'submitted',
        submittedAt: stamp,
        submitNote: note,
        playwrightStatus: keepPw,
        playwrightDetail:
          session.playwrightDetail ??
          'User confirmed submission manually. No unsupervised Playwright submit.',
      },
      include: assistInclude,
    }),
    prisma.application.update({
      where: { id: input.applicationId },
      data: {
        stage: loaded.application.stage === 'saved' || loaded.application.stage === 'preparing'
          ? 'applied'
          : loaded.application.stage,
        notes: appendSubmitNote(loaded.application.notes, note, stamp),
      },
    }),
  ]);

  return toApplyAssistSessionDto(row);
}

function appendSubmitNote(
  existing: string | null,
  submitNote: string | null,
  when: Date,
): string {
  const line = `Submitted via assisted apply (${when.toISOString().slice(0, 10)})${
    submitNote ? `: ${submitNote}` : ''
  }`;
  if (!existing?.trim()) return line;
  if (existing.includes('Submitted via assisted apply')) return existing;
  return `${existing.trim()}\n\n${line}`.slice(0, 5000);
}
