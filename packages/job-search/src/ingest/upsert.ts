import { createHash } from 'node:crypto';

import { prisma } from '@jobmatch/database';

import { extractSkillsFromText, SKILL_LEXICON } from '../match';
import { indexJobsBySourceExternal } from '../meili';
import { slugify } from './normalize';
import type { NormalizedIngestJob } from './types';

function jobSlug(job: NormalizedIngestJob): string {
  const hash = createHash('sha1')
    .update(`${job.source}:${job.externalId}`)
    .digest('hex')
    .slice(0, 10);
  const base = slugify(`${job.companyName}-${job.title}`, 90);
  return `${job.source}-${base}-${hash}`.slice(0, 120);
}

function resolveIngestSkills(job: NormalizedIngestJob): string[] {
  const tagged = (job.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const fromProse = extractSkillsFromText(
    `${job.title}\n${job.description}`,
    SKILL_LEXICON,
  );
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const skill of [...tagged, ...fromProse]) {
    const key = skill.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(skill);
  }
  return merged.slice(0, 40);
}

export async function upsertIngestJob(job: NormalizedIngestJob): Promise<'upserted' | 'skipped'> {
  if (!job.title.trim() || !job.companyName.trim() || !job.externalId.trim()) {
    return 'skipped';
  }

  const companySlug = slugify(job.companyName, 60);
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    create: {
      name: job.companyName.trim().slice(0, 200),
      slug: companySlug,
      websiteUrl: job.companyWebsiteUrl?.slice(0, 500) ?? null,
      logoUrl: job.companyLogoUrl?.slice(0, 500) ?? null,
      industry: job.companyIndustry?.slice(0, 120) ?? null,
      location: job.location?.slice(0, 200) ?? null,
    },
    update: {
      name: job.companyName.trim().slice(0, 200),
      websiteUrl: job.companyWebsiteUrl?.slice(0, 500) ?? undefined,
      logoUrl: job.companyLogoUrl?.slice(0, 500) ?? undefined,
      industry: job.companyIndustry?.slice(0, 120) ?? undefined,
      location: job.location?.slice(0, 200) ?? undefined,
    },
  });

  const slug = jobSlug(job);
  const existing = await prisma.job.findUnique({
    where: { source_externalId: { source: job.source, externalId: job.externalId } },
    select: { id: true },
  });

  const data = {
    companyId: company.id,
    title: job.title.trim().slice(0, 200),
    description: job.description.slice(0, 50_000),
    responsibilities: [] as string[],
    requirements: [] as string[],
    benefits: [] as string[],
    skills: resolveIngestSkills(job),
    employmentType: job.employmentType ?? 'full-time',
    workMode: job.workMode ?? 'remote',
    seniority: job.seniority ?? 'mid',
    location: job.location?.slice(0, 200) ?? null,
    city: job.city?.slice(0, 120) ?? null,
    country: job.country?.slice(0, 120) ?? null,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? 'USD',
    salaryPeriod: job.salaryPeriod ?? 'year',
    source: job.source,
    sourceUrl: job.sourceUrl?.slice(0, 500) ?? null,
    externalId: job.externalId.slice(0, 200),
    applyUrl: job.applyUrl?.slice(0, 500) ?? null,
    postedAt: job.postedAt ?? new Date(),
    isActive: job.isActive ?? true,
    embeddingStatus: 'idle' as const,
    embeddingError: null,
  };

  if (existing) {
    await prisma.job.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.job.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  // Best-effort Meilisearch sync — never fail ingest if Meili is down.
  try {
    await indexJobsBySourceExternal(job.source, job.externalId);
  } catch {
    // ignore
  }
  return 'upserted';
}

export async function upsertIngestJobs(
  jobs: NormalizedIngestJob[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ upserted: number; skipped: number; errors: string[] }> {
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (let i = 0; i < jobs.length; i += 1) {
    try {
      const result = await upsertIngestJob(jobs[i]!);
      if (result === 'upserted') upserted += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      const message = error instanceof Error ? error.message : String(error);
      if (errors.length < 5) {
        errors.push(`${jobs[i]?.externalId ?? '?'}: ${message}`);
      }
    }
    onProgress?.(i + 1, jobs.length);
  }
  return { upserted, skipped, errors };
}
