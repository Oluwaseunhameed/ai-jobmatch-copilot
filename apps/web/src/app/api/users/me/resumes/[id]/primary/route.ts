import { prisma } from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * Atomically mark one resume as the user's sole primary.
 * Uses a single UPDATE to avoid multi-statement races/hangs on pooled Postgres.
 */
export async function POST(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  await prisma.$executeRaw`
    UPDATE "resumes"
    SET
      "is_primary" = ("id" = ${id}),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "user_id" = ${app.user.id}
  `;

  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });

  if (!resume?.isPrimary) {
    return NextResponse.json(
      { error: { message: 'Could not set primary resume' } },
      { status: 500 },
    );
  }

  return NextResponse.json(resume, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
