import {
  calculateCompletenessScore,
  prisma,
  type Prisma,
} from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const profile = await prisma.careerProfile.upsert({
    where: { userId: app.user.id },
    create: { userId: app.user.id },
    update: {},
    include: { skills: { orderBy: { createdAt: 'asc' } } },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { skills, ...rawFields } = body;

  await prisma.careerProfile.upsert({
    where: { userId: app.user.id },
    create: { userId: app.user.id },
    update: {},
  });

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  ) as Prisma.CareerProfileUpdateInput;

  const data: Prisma.CareerProfileUpdateInput = { ...fields };

  if (Array.isArray(skills)) {
    data.skills = {
      deleteMany: {},
      create: skills
        .filter((s: { name?: string }) => s?.name?.trim())
        .map((s: { name: string; category?: string; level?: string | null; years?: number | null }) => ({
          name: s.name.trim(),
          category: s.category?.trim() || 'other',
          level: s.level ?? null,
          years: s.years ?? null,
        })),
    };
  }

  const updated = await prisma.careerProfile.update({
    where: { userId: app.user.id },
    data,
    include: { skills: { orderBy: { createdAt: 'asc' } } },
  });

  const completenessScore = calculateCompletenessScore(updated);

  const profile = await prisma.careerProfile.update({
    where: { userId: app.user.id },
    data: { completenessScore },
    include: { skills: { orderBy: { createdAt: 'asc' } } },
  });

  return NextResponse.json(profile);
}
