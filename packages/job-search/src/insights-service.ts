import { prisma } from '@jobmatch/database';
import type { JobInsightsDto } from '@jobmatch/types';

import { buildJobInsights, type ProfileForInsights } from './insights';
import { getJobBySlug } from './search';

export { buildJobInsights, fitLevelTone, type ProfileForInsights } from './insights';

export async function getJobInsights(
  slug: string,
  userId: string,
): Promise<JobInsightsDto | null> {
  const job = await getJobBySlug(slug, userId);
  if (!job) return null;

  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    include: { skills: true },
  });

  const profileInput: ProfileForInsights | null = profile
    ? {
        yearsOfExperience: profile.yearsOfExperience,
        workLocationPreference: profile.workLocationPreference,
        employmentType: profile.employmentType,
        salaryExpectation: profile.salaryExpectation,
        salaryCurrency: profile.salaryCurrency,
        desiredRoles: profile.desiredRoles,
        skills: profile.skills.map((s) => ({
          name: s.name,
          category: s.category,
          level: s.level,
          years: s.years,
        })),
      }
    : null;

  return buildJobInsights(job, profileInput);
}
