import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { toApplicationDraftDto } from '@jobmatch/resume-parsing';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.applicationDraft.findFirst({
    where: { id, userId: app.user.id },
    include: {
      job: { include: { company: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: { message: 'Draft not found' } }, { status: 404 });
  }

  return NextResponse.json(toApplicationDraftDto(row), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
