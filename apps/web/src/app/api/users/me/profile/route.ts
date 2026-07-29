import {
  calculateCompletenessScore,
  prisma,
  type Prisma,
} from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedProfileJson,
  invalidateProfileCache,
} from '@/lib/cache/jobmatch-hubs-cache';

const profileInclude = {
  skills: { orderBy: { createdAt: 'asc' as const } },
  education: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  workExperience: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
};

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const profile = await getCachedProfileJson(app.user.id, () =>
    prisma.careerProfile.upsert({
      where: { userId: app.user.id },
      create: { userId: app.user.id },
      update: {},
      include: profileInclude,
    }),
  );

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { skills, education, workExperience, ...rawFields } = body;

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

  if (Array.isArray(education)) {
    data.education = {
      deleteMany: {},
      create: education
        .filter((e: { school?: string }) => e?.school?.trim())
        .map(
          (
            e: {
              school: string;
              degree?: string | null;
              field?: string | null;
              startYear?: number | null;
              endYear?: number | null;
              description?: string | null;
              sortOrder?: number;
            },
            index: number,
          ) => ({
            school: e.school.trim(),
            degree: e.degree?.trim() || null,
            field: e.field?.trim() || null,
            startYear: e.startYear ?? null,
            endYear: e.endYear ?? null,
            description: e.description?.trim() || null,
            sortOrder: e.sortOrder ?? index,
          }),
        ),
    };
  }

  if (Array.isArray(workExperience)) {
    data.workExperience = {
      deleteMany: {},
      create: workExperience
        .filter((e: { title?: string; company?: string }) => e?.title?.trim() && e?.company?.trim())
        .map(
          (
            e: {
              title: string;
              company: string;
              location?: string | null;
              startMonth?: string | null;
              endMonth?: string | null;
              isCurrent?: boolean;
              description?: string | null;
              highlights?: string[];
              sortOrder?: number;
            },
            index: number,
          ) => ({
            title: e.title.trim(),
            company: e.company.trim(),
            location: e.location?.trim() || null,
            startMonth: e.startMonth?.trim() || null,
            endMonth: e.isCurrent ? null : e.endMonth?.trim() || null,
            isCurrent: Boolean(e.isCurrent),
            description: e.description?.trim() || null,
            highlights: Array.isArray(e.highlights)
              ? e.highlights.map((h) => String(h).trim()).filter(Boolean)
              : [],
            sortOrder: e.sortOrder ?? index,
          }),
        ),
    };
  }

  const updated = await prisma.careerProfile.update({
    where: { userId: app.user.id },
    data,
    include: profileInclude,
  });

  const completenessScore = calculateCompletenessScore(updated);

  const profile = await prisma.careerProfile.update({
    where: { userId: app.user.id },
    data: { completenessScore },
    include: profileInclude,
  });

  await invalidateProfileCache(app.user.id);
  return NextResponse.json(profile);
}
