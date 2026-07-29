import { prisma } from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedPreferencesJson,
  invalidatePreferencesCache,
} from '@/lib/cache/jobmatch-hubs-cache';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const preferences = await getCachedPreferencesJson(app.user.id, () =>
    prisma.userPreference.upsert({
      where: { userId: app.user.id },
      create: { userId: app.user.id },
      update: {},
    }),
  );

  return NextResponse.json(preferences);
}

export async function PATCH(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = await request.json();

  await prisma.userPreference.upsert({
    where: { userId: app.user.id },
    create: { userId: app.user.id, ...body },
    update: body,
  });

  const preferences = await prisma.userPreference.findUniqueOrThrow({
    where: { userId: app.user.id },
  });

  await invalidatePreferencesCache(app.user.id);
  return NextResponse.json(preferences);
}
