import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import {
  applicationInclude,
  isApplicationStage,
  toApplicationDto,
} from '@jobmatch/job-search';
import { notifyApplicationStageChanged } from '@jobmatch/resume-parsing';

import { requireAppUser } from '@/lib/auth';
import { invalidateApplicationsCache } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.application.findFirst({
    where: { id, userId: app.user.id },
    include: applicationInclude,
  });

  if (!row) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  return NextResponse.json(toApplicationDto(row), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    stage?: string;
    notes?: string | null;
    resumeId?: string | null;
    draftId?: string | null;
  } | null;

  if (
    !body ||
    (body.stage === undefined &&
      body.notes === undefined &&
      body.resumeId === undefined &&
      body.draftId === undefined)
  ) {
    return NextResponse.json(
      { error: { message: 'Provide stage, notes, resumeId, and/or draftId' } },
      { status: 400 },
    );
  }

  const existing = await prisma.application.findFirst({
    where: { id, userId: app.user.id },
    select: { id: true, jobId: true, stage: true },
  });
  if (!existing) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  const data: {
    stage?: string;
    notes?: string | null;
    resumeId?: string | null;
    draftId?: string | null;
  } = {};

  if (body.stage !== undefined) {
    if (!isApplicationStage(body.stage)) {
      return NextResponse.json({ error: { message: 'Invalid stage' } }, { status: 400 });
    }
    data.stage = body.stage;
  }

  if (body.notes !== undefined) {
    data.notes =
      body.notes === null ? null : String(body.notes).trim().slice(0, 5_000) || null;
  }

  if (body.resumeId !== undefined) {
    if (body.resumeId === null || body.resumeId === '') {
      data.resumeId = null;
    } else {
      const resume = await prisma.resume.findFirst({
        where: { id: body.resumeId, userId: app.user.id },
        select: { id: true },
      });
      if (!resume) {
        return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
      }
      data.resumeId = resume.id;
    }
  }

  if (body.draftId !== undefined) {
    if (body.draftId === null || body.draftId === '') {
      data.draftId = null;
    } else {
      const draft = await prisma.applicationDraft.findFirst({
        where: { id: body.draftId, userId: app.user.id, jobId: existing.jobId },
        select: { id: true },
      });
      if (!draft) {
        return NextResponse.json({ error: { message: 'Draft not found' } }, { status: 404 });
      }
      data.draftId = draft.id;
    }
  }

  const updated = await prisma.application.update({
    where: { id },
    data,
    include: applicationInclude,
  });

  if (data.stage && data.stage !== existing.stage && updated.job) {
    void notifyApplicationStageChanged({
      userId: app.user.id,
      jobTitle: updated.job.title,
      companyName: updated.job.company.name,
      stage: updated.stage,
    });
  }

  await invalidateApplicationsCache(app.user.id);
  return NextResponse.json(toApplicationDto(updated));
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.application.findFirst({
    where: { id, userId: app.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });
  await invalidateApplicationsCache(app.user.id);
  return NextResponse.json({ ok: true });
}
