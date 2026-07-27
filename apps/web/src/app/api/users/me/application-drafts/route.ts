import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { toApplicationDraftDto } from '@jobmatch/resume-parsing';

import { requireAppUser } from '@/lib/auth';
import { requestApplicationGenerate } from '@/lib/application-generate';

export const dynamic = 'force-dynamic';

const MAX_QUESTIONS = 3;

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    resumeId?: string;
    jobId?: string;
    questions?: string[];
  } | null;

  const resumeId = body?.resumeId?.trim();
  const jobId = body?.jobId?.trim();
  if (!resumeId || !jobId) {
    return NextResponse.json(
      { error: { message: 'resumeId and jobId are required' } },
      { status: 400 },
    );
  }

  const questions = Array.isArray(body?.questions)
    ? body.questions
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, MAX_QUESTIONS)
    : [];

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: app.user.id },
  });
  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }
  if (resume.parseStatus !== 'ready') {
    return NextResponse.json(
      { error: { message: 'Parse this resume before generating application materials.' } },
      { status: 409 },
    );
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  const existing = await prisma.applicationDraft.findFirst({
    where: {
      userId: app.user.id,
      resumeId,
      jobId,
      status: { in: ['queued', 'processing'] },
    },
    include: {
      job: { include: { company: true } },
    },
  });
  if (existing) {
    return NextResponse.json(toApplicationDraftDto(existing), { status: 202 });
  }

  const draft = await prisma.applicationDraft.create({
    data: {
      userId: app.user.id,
      resumeId,
      jobId,
      status: 'queued',
      questions: questions.length > 0 ? questions : undefined,
    },
    include: {
      job: { include: { company: true } },
    },
  });

  await requestApplicationGenerate(app.user.id, draft.id, resumeId, jobId, 'manual');

  return NextResponse.json(toApplicationDraftDto(draft), { status: 202 });
}
