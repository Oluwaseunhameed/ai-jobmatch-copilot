import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import {
  labelSavedSearchQuery,
  normalizeSavedSearchQuery,
  toSavedSearchDto,
} from '@jobmatch/job-search';
import type { SavedSearchQuery } from '@jobmatch/types';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId: app.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: { message: 'Saved search not found' } }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    query?: SavedSearchQuery;
    alertEnabled?: boolean;
  } | null;

  const data: {
    name?: string;
    query?: SavedSearchQuery;
    alertEnabled?: boolean;
  } = {};

  if (typeof body?.name === 'string' && body.name.trim()) {
    data.name = body.name.trim().slice(0, 80);
  }
  if (body?.query) {
    data.query = normalizeSavedSearchQuery(body.query);
    if (!data.name) {
      data.name = labelSavedSearchQuery(data.query).slice(0, 80);
    }
  }
  if (typeof body?.alertEnabled === 'boolean') {
    data.alertEnabled = body.alertEnabled;
  }

  const row = await prisma.savedSearch.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json(toSavedSearchDto(row));
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId: app.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: { message: 'Saved search not found' } }, { status: 404 });
  }

  await prisma.savedSearch.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
