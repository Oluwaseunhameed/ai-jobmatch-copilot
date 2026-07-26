import { prisma } from '@jobmatch/database';
import { deleteObject } from '@jobmatch/storage';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });

  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  return NextResponse.json(resume);
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  const body = (await request.json()) as { title?: string; isPrimary?: boolean | string };

  const wantsPrimary =
    body.isPrimary === true || body.isPrimary === 'true';

  if (wantsPrimary) {
    await prisma.$executeRaw`
      UPDATE "resumes"
      SET
        "is_primary" = ("id" = ${id}),
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "user_id" = ${app.user.id}
    `;

    if (body.title !== undefined) {
      await prisma.resume.update({
        where: { id },
        data: { title: body.title.trim() },
      });
    }

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

  const resume = await prisma.resume.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.isPrimary === false || body.isPrimary === 'false'
        ? { isPrimary: false }
        : {}),
    },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });

  return NextResponse.json(resume, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  await prisma.resume.delete({ where: { id } });
  await deleteObject(
    existing.storageKey,
    existing.storageProvider as 'local' | 's3',
  ).catch(() => undefined);

  if (existing.isPrimary) {
    const next = await prisma.resume.findFirst({
      where: { userId: app.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (next) {
      await prisma.resume.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
