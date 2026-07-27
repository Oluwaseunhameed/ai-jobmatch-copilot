import { prisma } from '@jobmatch/database';
import type { CompanyDto, CompanyProfileDto, CompanyViewerStatsDto } from '@jobmatch/types';

import { buildCompanyProfile, type CompanyJobInput } from './company-profile';
import { enrichJobsWithMatch, loadProfileSkillNames } from './match';

export { buildCompanyProfile, type CompanyJobInput } from './company-profile';

function toCompanyDto(row: {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  about: string | null;
}): CompanyDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.websiteUrl,
    logoUrl: row.logoUrl,
    industry: row.industry,
    size: row.size,
    location: row.location,
    about: row.about,
  };
}

async function loadViewerStats(
  userId: string,
  companyId: string,
  jobs: CompanyJobInput[],
): Promise<CompanyViewerStatsDto> {
  const jobIds = jobs.map((j) => j.id);
  const [savedRoles, applications] = await Promise.all([
    jobIds.length
      ? prisma.jobInteraction.count({
          where: { userId, type: 'saved', jobId: { in: jobIds } },
        })
      : Promise.resolve(0),
    jobIds.length
      ? prisma.application.count({
          where: { userId, jobId: { in: jobIds } },
        })
      : Promise.resolve(0),
  ]);

  const scores = jobs
    .map((j) => j.matchScore)
    .filter((score): score is number => typeof score === 'number');
  const avgMatchScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return { savedRoles, applications, avgMatchScore };
}

export async function getCompanyProfile(
  slug: string,
  userId?: string,
): Promise<CompanyProfileDto | null> {
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) return null;

  const rows = await prisma.job.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { postedAt: 'desc' },
  });

  let profileSkills: string[] = [];
  if (userId) {
    profileSkills = await loadProfileSkillNames(userId);
  }

  const matchByJobId = new Map<string, number | undefined>();
  if (profileSkills.length > 0) {
    const enriched = enrichJobsWithMatch(
      rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        skills: row.skills,
      })),
      profileSkills,
    );
    for (const job of enriched) {
      matchByJobId.set(job.id, job.matchScore);
    }
  }

  const jobs: CompanyJobInput[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    workMode: row.workMode,
    seniority: row.seniority,
    location: row.location,
    city: row.city,
    country: row.country,
    skills: row.skills,
    benefits: row.benefits,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    salaryPeriod: row.salaryPeriod,
    postedAt: row.postedAt,
    matchScore: matchByJobId.get(row.id),
  }));

  let viewer: CompanyViewerStatsDto | undefined;
  if (userId) {
    viewer = await loadViewerStats(userId, company.id, jobs);
  }

  return buildCompanyProfile({
    company: toCompanyDto(company),
    jobs,
    viewer,
  });
}
