import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';

import { requireAppUser } from '@/lib/auth';
import { PlanLimitError, assertWithinPlanLimit } from '@/lib/billing/limits';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { slug } = await params;
  const job = await prisma.job.findFirst({
    where: { slug, isActive: true },
    select: { id: true },
  });

  if (!job) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  const alreadySaved = await prisma.jobInteraction.findUnique({
    where: {
      userId_jobId_type: { userId: app.user.id, jobId: job.id, type: 'saved' },
    },
    select: { id: true },
  });

  if (!alreadySaved) {
    try {
      await assertWithinPlanLimit(app.user.id, 'saved_job');
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return NextResponse.json({ error: error.toJSON() }, { status: error.status });
      }
      throw error;
    }
  }

  await prisma.jobInteraction.upsert({
    where: {
      userId_jobId_type: { userId: app.user.id, jobId: job.id, type: 'saved' },
    },
    update: {},
    create: { userId: app.user.id, jobId: job.id, type: 'saved' },
  });

  return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { slug } = await params;
  const job = await prisma.job.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!job) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  await prisma.jobInteraction.deleteMany({
    where: { userId: app.user.id, jobId: job.id, type: 'saved' },
  });

  return NextResponse.json({ saved: false }, { headers: { 'Cache-Control': 'no-store' } });
}
