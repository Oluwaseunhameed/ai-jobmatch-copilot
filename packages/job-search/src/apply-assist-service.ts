import { prisma, type Prisma } from '@jobmatch/database';
import type { ApplyAssistSessionDto } from '@jobmatch/types';

import {
  buildApplyChecklist,
  buildFillPlan,
  evaluatePlaywrightGate,
  normalizeAssistStatus,
  toApplyAssistSessionDto,
  type ApplyAssistContext,
} from './apply-assist';

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

  const gate = evaluatePlaywrightGate({
    fillApproved: true,
    applyUrl: loaded.ctx.applyUrl,
  });

  const row = await prisma.applyAssistSession.update({
    where: { id: session.id },
    data: {
      status: 'fill_approved',
      fillApprovedAt: new Date(),
      playwrightStatus: gate.status,
      playwrightDetail: gate.detail,
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

  const [row] = await prisma.$transaction([
    prisma.applyAssistSession.update({
      where: { id: session.id },
      data: {
        status: 'submitted',
        submittedAt: stamp,
        submitNote: note,
        playwrightStatus:
          session.playwrightStatus === 'fixture_ran' ? 'fixture_ran' : 'skipped',
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
