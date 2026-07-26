import {
  calculateCompletenessScore,
  prisma,
  type Prisma,
} from '@jobmatch/database';

type ParsedJson = {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
};

export async function updateProfile(
  userId: string,
  parsed: unknown,
  options: {
    applyHeadline: boolean;
    applySummary: boolean;
    applySkills: boolean;
  },
) {
  const data = (parsed ?? {}) as ParsedJson;

  await prisma.careerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const current = await prisma.careerProfile.findUnique({
    where: { userId },
    include: { skills: true },
  });

  if (!current) {
    throw new Error('Profile unavailable');
  }

  const patch: Prisma.CareerProfileUpdateInput = {};

  if (options.applyHeadline && data.headline?.trim()) {
    if (!current.headline?.trim()) {
      patch.headline = data.headline.trim().slice(0, 120);
    }
  }

  if (options.applySummary && data.summary?.trim()) {
    if (!current.summary?.trim()) {
      patch.summary = data.summary.trim().slice(0, 4000);
    }
  }

  if (options.applySkills && Array.isArray(data.skills) && data.skills.length) {
    const existingNames = new Set(current.skills.map((s) => s.name.toLowerCase()));
    const toCreate = data.skills
      .map((name) => name.trim())
      .filter((name) => name && !existingNames.has(name.toLowerCase()))
      .slice(0, 20)
      .map((name) => ({
        name,
        category: 'technical',
        level: 'intermediate',
      }));

    if (toCreate.length) {
      patch.skills = { create: toCreate };
    }
  }

  const updated = await prisma.careerProfile.update({
    where: { userId },
    data: patch,
    include: { skills: { orderBy: { createdAt: 'asc' } } },
  });

  const completenessScore = calculateCompletenessScore(updated);

  return prisma.careerProfile.update({
    where: { userId },
    data: { completenessScore },
    include: { skills: { orderBy: { createdAt: 'asc' } } },
  });
}
