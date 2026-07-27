import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import {
  labelSavedSearchQuery,
  normalizeSavedSearchQuery,
  savedSearchHasFilters,
  toSavedSearchDto,
} from '@jobmatch/job-search';
import type { SavedSearchQuery } from '@jobmatch/types';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_SAVED_SEARCHES = 20;

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const rows = await prisma.savedSearch.findMany({
    where: { userId: app.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(
    { searches: rows.map(toSavedSearchDto) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    query?: SavedSearchQuery;
    alertEnabled?: boolean;
  } | null;

  const query = normalizeSavedSearchQuery(body?.query ?? {});
  if (!savedSearchHasFilters(query)) {
    return NextResponse.json(
      { error: { message: 'Add a keyword or at least one filter before saving a search.' } },
      { status: 400 },
    );
  }

  const count = await prisma.savedSearch.count({ where: { userId: app.user.id } });
  if (count >= MAX_SAVED_SEARCHES) {
    return NextResponse.json(
      {
        error: {
          message: `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one to add another.`,
        },
      },
      { status: 403 },
    );
  }

  const name =
    body?.name?.trim() ||
    labelSavedSearchQuery(query).slice(0, 80) ||
    'Saved search';

  const row = await prisma.savedSearch.create({
    data: {
      userId: app.user.id,
      name,
      query,
      alertEnabled: body?.alertEnabled !== false,
    },
  });

  return NextResponse.json(toSavedSearchDto(row), { status: 201 });
}
