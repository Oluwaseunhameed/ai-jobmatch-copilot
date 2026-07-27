import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { toOptimizationDto } from '@jobmatch/resume-parsing';

import { requireAppUser } from '@/lib/auth';
import { requestResumeOptimize } from '@/lib/resume-optimize';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: resumeId } = await params;
  const body = (await request.json().catch(() => null)) as { jobId?: string } | null;
  const jobId = body?.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: { message: 'jobId is required' } }, { status: 400 });
  }

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: app.user.id },
  });
  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }
  if (resume.parseStatus !== 'ready') {
    return NextResponse.json(
      { error: { message: 'Parse this resume before optimising it for a job.' } },
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

  const existing = await prisma.resumeOptimization.findFirst({
    where: {
      userId: app.user.id,
      resumeId,
      jobId,
      status: { in: ['queued', 'processing'] },
    },
    include: {
      job: { include: { company: true } },
      version: true,
    },
  });
  if (existing) {
    return NextResponse.json(toOptimizationDto(existing), { status: 202 });
  }

  const optimization = await prisma.resumeOptimization.create({
    data: {
      userId: app.user.id,
      resumeId,
      jobId,
      status: 'queued',
    },
    include: {
      job: { include: { company: true } },
      version: true,
    },
  });

  await requestResumeOptimize(app.user.id, optimization.id, resumeId, jobId, 'manual');

  return NextResponse.json(toOptimizationDto(optimization), { status: 202 });
}
