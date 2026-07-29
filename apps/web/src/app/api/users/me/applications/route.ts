import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import {
  applicationInclude,
  isApplicationStage,
  toApplicationDto,
  type ApplicationStage,
} from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedApplicationsJson,
  invalidateApplicationsCache,
} from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const payload = await getCachedApplicationsJson(app.user.id, async () => {
    const rows = await prisma.application.findMany({
      where: { userId: app.user.id },
      include: applicationInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return { applications: rows.map(toApplicationDto) };
  });

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    jobId?: string;
    resumeId?: string | null;
    draftId?: string | null;
    stage?: string;
    notes?: string | null;
  } | null;

  const jobId = body?.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: { message: 'jobId is required' } }, { status: 400 });
  }

  let stage: ApplicationStage = 'preparing';
  if (body?.stage) {
    if (!isApplicationStage(body.stage)) {
      return NextResponse.json({ error: { message: 'Invalid stage' } }, { status: 400 });
    }
    stage = body.stage;
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  const existing = await prisma.application.findUnique({
    where: { userId_jobId: { userId: app.user.id, jobId } },
    include: applicationInclude,
  });
  if (existing) {
    return NextResponse.json(toApplicationDto(existing), { status: 200 });
  }

  let resumeId = body?.resumeId?.trim() || null;
  let draftId = body?.draftId?.trim() || null;

  if (resumeId) {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: app.user.id },
      select: { id: true },
    });
    if (!resume) {
      return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
    }
  }

  if (draftId) {
    const draft = await prisma.applicationDraft.findFirst({
      where: { id: draftId, userId: app.user.id, jobId },
      select: { id: true, resumeId: true },
    });
    if (!draft) {
      return NextResponse.json({ error: { message: 'Draft not found' } }, { status: 404 });
    }
    if (!resumeId) resumeId = draft.resumeId;
  } else {
    const latestDraft = await prisma.applicationDraft.findFirst({
      where: { userId: app.user.id, jobId, status: 'ready' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, resumeId: true },
    });
    if (latestDraft) {
      draftId = latestDraft.id;
      if (!resumeId) resumeId = latestDraft.resumeId;
    }
  }

  if (!resumeId) {
    const primary = await prisma.resume.findFirst({
      where: { userId: app.user.id, isPrimary: true },
      select: { id: true },
    });
    resumeId = primary?.id ?? null;
  }

  const notes =
    typeof body?.notes === 'string' ? body.notes.trim().slice(0, 5_000) || null : null;

  const created = await prisma.application.create({
    data: {
      userId: app.user.id,
      jobId,
      stage,
      notes,
      resumeId,
      draftId,
    },
    include: applicationInclude,
  });

  await invalidateApplicationsCache(app.user.id);
  return NextResponse.json(toApplicationDto(created), { status: 201 });
}
