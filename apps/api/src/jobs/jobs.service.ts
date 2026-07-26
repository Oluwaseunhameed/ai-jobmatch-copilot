import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@jobmatch/database';
import { getJobBySlug, searchJobs, type SearchJobsInput } from '@jobmatch/job-search';

@Injectable()
export class JobsService {
  search(userId: string, input: SearchJobsInput) {
    return searchJobs({ ...input, userId });
  }

  async getBySlug(userId: string, slug: string) {
    const job = await getJobBySlug(slug, userId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async listSaved(userId: string) {
    const rows = await prisma.jobInteraction.findMany({
      where: { userId, type: 'saved' },
      orderBy: { createdAt: 'desc' },
      include: {
        job: { include: { company: true } },
      },
    });

    return rows.map((row) => ({
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
      isSaved: true,
      savedAt: row.createdAt.toISOString(),
    }));
  }

  async save(userId: string, jobId: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, isActive: true },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await prisma.jobInteraction.upsert({
      where: { userId_jobId_type: { userId, jobId, type: 'saved' } },
      update: {},
      create: { userId, jobId, type: 'saved' },
    });

    return { saved: true };
  }

  async unsave(userId: string, jobId: string) {
    await prisma.jobInteraction.deleteMany({
      where: { userId, jobId, type: 'saved' },
    });
    return { saved: false };
  }

  async recordView(userId: string, jobId: string) {
    await prisma.jobInteraction.upsert({
      where: { userId_jobId_type: { userId, jobId, type: 'viewed' } },
      update: {},
      create: { userId, jobId, type: 'viewed' },
    });
    return { viewed: true };
  }
}
