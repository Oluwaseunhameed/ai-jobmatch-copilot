import { prisma } from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { requestResumeParse } from '@/lib/resume-parse';

type Params = { params: Promise<{ id: string }> };

/**
 * Request a (re)parse.
 *
 * Returns as soon as the job is accepted — the client polls the resume for the
 * outcome. Blocking here would tie a 30s+ AI call to an HTTP request.
 */
export async function POST(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
    select: { id: true, parseStatus: true },
  });

  if (!existing) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  if (existing.parseStatus !== 'processing') {
    await prisma.resume.update({
      where: { id },
      data: { parseStatus: 'queued', parseError: null },
    });

    await requestResumeParse(app.user.id, id, 'manual');
  }

  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });

  return NextResponse.json(resume, {
    status: 202,
    headers: { 'Cache-Control': 'no-store' },
  });
}
