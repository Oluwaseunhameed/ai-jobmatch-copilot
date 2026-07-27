import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { toOptimizationDto } from '@jobmatch/resume-parsing';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; optId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: resumeId, optId } = await params;
  const row = await prisma.resumeOptimization.findFirst({
    where: { id: optId, resumeId, userId: app.user.id },
    include: {
      job: { include: { company: true } },
      version: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: { message: 'Optimization not found' } }, { status: 404 });
  }

  return NextResponse.json(toOptimizationDto(row), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
