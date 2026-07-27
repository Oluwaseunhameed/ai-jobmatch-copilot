import { prisma } from '@jobmatch/database';
import type { CareerGrowthHubDto } from '@jobmatch/types';

import {
  buildCareerGrowthHub,
  type GrowthJobInput,
  type GrowthProfileInput,
} from './growth';

export {
  buildCareerGrowthHub,
  learningForSkill,
  LEARNING_CATALOG,
  type GrowthJobInput,
  type GrowthProfileInput,
} from './growth';

export async function getCareerGrowthHub(userId: string): Promise<CareerGrowthHubDto> {
  const [profile, jobs] = await Promise.all([
    prisma.careerProfile.findUnique({
      where: { userId },
      include: { skills: true },
    }),
    prisma.job.findMany({
      where: { isActive: true },
      select: {
        title: true,
        skills: true,
        seniority: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
      },
    }),
  ]);

  const profileInput: GrowthProfileInput | null = profile
    ? {
        yearsOfExperience: profile.yearsOfExperience,
        desiredRoles: profile.desiredRoles,
        salaryExpectation: profile.salaryExpectation,
        salaryCurrency: profile.salaryCurrency,
        currentJobTitle: profile.currentJobTitle,
        skills: profile.skills.map((s) => ({ name: s.name })),
      }
    : null;

  const jobInputs: GrowthJobInput[] = jobs.map((job) => ({
    title: job.title,
    skills: job.skills,
    seniority: job.seniority,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
  }));

  return buildCareerGrowthHub(profileInput, jobInputs);
}
