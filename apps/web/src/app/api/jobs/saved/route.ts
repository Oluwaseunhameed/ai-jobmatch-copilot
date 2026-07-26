import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { enrichJobsWithMatch, loadProfileSkillNames } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const [rows, profileSkills] = await Promise.all([
    prisma.jobInteraction.findMany({
      where: { userId: app.user.id, type: 'saved' },
      orderBy: { createdAt: 'desc' },
      include: { job: { include: { company: true } } },
    }),
    loadProfileSkillNames(app.user.id),
  ]);

  const jobs = enrichJobsWithMatch(
    rows.map((row) => ({
      id: row.job.id,
      slug: row.job.slug,
      title: row.job.title,
      description: row.job.description,
      responsibilities: row.job.responsibilities,
      requirements: row.job.requirements,
      benefits: row.job.benefits,
      skills: row.job.skills,
      employmentType: row.job.employmentType,
      workMode: row.job.workMode,
      seniority: row.job.seniority,
      location: row.job.location,
      city: row.job.city,
      country: row.job.country,
      salaryMin: row.job.salaryMin,
      salaryMax: row.job.salaryMax,
      salaryCurrency: row.job.salaryCurrency,
      salaryPeriod: row.job.salaryPeriod,
      source: row.job.source,
      sourceUrl: row.job.sourceUrl,
      applyUrl: row.job.applyUrl,
      postedAt: row.job.postedAt.toISOString(),
      expiresAt: row.job.expiresAt ? row.job.expiresAt.toISOString() : null,
      isActive: row.job.isActive,
      company: {
        id: row.job.company.id,
        name: row.job.company.name,
        slug: row.job.company.slug,
        websiteUrl: row.job.company.websiteUrl,
        logoUrl: row.job.company.logoUrl,
        industry: row.job.company.industry,
        size: row.job.company.size,
        location: row.job.company.location,
        about: row.job.company.about,
      },
      isSaved: true as const,
      savedAt: row.createdAt.toISOString(),
    })),
    profileSkills,
  );

  return NextResponse.json({ jobs }, { headers: { 'Cache-Control': 'no-store' } });
}
