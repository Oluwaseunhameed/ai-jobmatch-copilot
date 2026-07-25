import { Injectable, NotFoundException } from '@nestjs/common';
import {
  calculateCompletenessScore,
  prisma,
  type Prisma,
} from '@jobmatch/database';

export type SkillWrite = {
  name: string;
  category: string;
  level?: string | null;
  years?: number | null;
};

export type ProfileWrite = {
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timeZone?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  currentJobTitle?: string | null;
  yearsOfExperience?: number | null;
  desiredRoles?: string[];
  employmentType?: string | null;
  salaryExpectation?: number | null;
  salaryCurrency?: string | null;
  noticePeriodDays?: number | null;
  workAuthorization?: string | null;
  visaSponsorshipNeeded?: boolean;
  workLocationPreference?: string | null;
  skills?: SkillWrite[];
};

@Injectable()
export class ProfilesService {
  async getOrCreate(userId: string) {
    const existing = await prisma.careerProfile.findUnique({
      where: { userId },
      include: { skills: { orderBy: { createdAt: 'asc' } } },
    });

    if (existing) return existing;

    return prisma.careerProfile.create({
      data: { userId },
      include: { skills: true },
    });
  }

  async update(userId: string, input: ProfileWrite) {
    await this.getOrCreate(userId);

    const { skills, ...rawFields } = input;
    const fields = Object.fromEntries(
      Object.entries(rawFields).filter(([, v]) => v !== undefined),
    );

    const data: Prisma.CareerProfileUpdateInput = { ...fields };

    if (skills) {
      data.skills = {
        deleteMany: {},
        create: skills
          .filter((s) => s.name?.trim())
          .map((s) => ({
            name: s.name.trim(),
            category: s.category?.trim() || 'other',
            level: s.level ?? null,
            years: s.years ?? null,
          })),
      };
    }

    const updated = await prisma.careerProfile.update({
      where: { userId },
      data,
      include: { skills: { orderBy: { createdAt: 'asc' } } },
    });

    const completenessScore = calculateCompletenessScore(updated);

    return prisma.careerProfile.update({
      where: { userId },
      data: { completenessScore },
      include: { skills: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async replaceSkills(userId: string, skills: SkillWrite[]) {
    const profile = await prisma.careerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.update(userId, { skills });
  }
}
