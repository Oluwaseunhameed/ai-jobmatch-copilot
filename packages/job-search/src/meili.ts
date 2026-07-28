import { MeiliSearch, type Index } from 'meilisearch';

import { prisma } from '@jobmatch/database';
import type { JobSearchFacet } from '@jobmatch/types';

export type MeiliJobDocument = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  country: string | null;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  companyName: string;
  postedAt: number;
  isActive: boolean;
};

export function meiliConfigured(): boolean {
  return Boolean(process.env.MEILI_HOST?.trim());
}

export function meiliIndexName(): string {
  return process.env.MEILI_INDEX_JOBS?.trim() || 'jobs';
}

function createClient(): MeiliSearch | null {
  const host = process.env.MEILI_HOST?.trim();
  if (!host) return null;
  return new MeiliSearch({
    host,
    apiKey: process.env.MEILI_API_KEY?.trim() || undefined,
  });
}

export async function meiliReady(): Promise<boolean> {
  const client = createClient();
  if (!client) return false;
  try {
    await client.health();
    return true;
  } catch {
    return false;
  }
}

async function getIndex(): Promise<Index<MeiliJobDocument> | null> {
  const client = createClient();
  if (!client) return null;
  return client.index<MeiliJobDocument>(meiliIndexName());
}

export async function ensureMeiliJobsIndex(): Promise<boolean> {
  const client = createClient();
  if (!client) return false;

  const uid = meiliIndexName();
  try {
    await client.getIndex(uid);
  } catch {
    await client.createIndex(uid, { primaryKey: 'id' });
  }

  const index = client.index<MeiliJobDocument>(uid);
  await index.updateSettings({
    searchableAttributes: ['title', 'skills', 'companyName', 'description', 'location'],
    filterableAttributes: [
      'workMode',
      'employmentType',
      'seniority',
      'country',
      'salaryMax',
      'salaryMin',
      'isActive',
      'postedAt',
    ],
    sortableAttributes: ['postedAt', 'salaryMax', 'salaryMin'],
  });
  return true;
}

export function toMeiliJobDocument(job: {
  id: string;
  title: string;
  description: string;
  skills: string[];
  location: string | null;
  country: string | null;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: Date;
  isActive: boolean;
  company: { name: string };
}): MeiliJobDocument {
  return {
    id: job.id,
    title: job.title,
    description: job.description.slice(0, 8_000),
    skills: job.skills ?? [],
    location: job.location,
    country: job.country,
    workMode: job.workMode,
    employmentType: job.employmentType,
    seniority: job.seniority,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    companyName: job.company.name,
    postedAt: job.postedAt.getTime(),
    isActive: job.isActive,
  };
}

export async function indexJobById(jobId: string): Promise<void> {
  if (!(await meiliReady())) return;
  await ensureMeiliJobsIndex();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: { select: { name: true } } },
  });
  if (!job) return;
  const index = await getIndex();
  if (!index) return;
  if (!job.isActive) {
    await index.deleteDocument(job.id);
    return;
  }
  await index.addDocuments([toMeiliJobDocument(job)]);
}

export async function indexJobsBySourceExternal(
  source: string,
  externalId: string,
): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { source_externalId: { source, externalId } },
    select: { id: true },
  });
  if (job) await indexJobById(job.id);
}

export async function reindexAllJobs(options?: {
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ indexed: number; skipped: boolean }> {
  if (!(await meiliReady())) {
    return { indexed: 0, skipped: true };
  }
  await ensureMeiliJobsIndex();
  const index = await getIndex();
  if (!index) return { indexed: 0, skipped: true };

  const batchSize = options?.batchSize ?? 200;
  const total = await prisma.job.count({ where: { isActive: true } });
  let done = 0;
  let cursor: string | undefined;

  while (done < total) {
    const rows = await prisma.job.findMany({
      where: { isActive: true },
      include: { company: { select: { name: true } } },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!rows.length) break;
    await index.addDocuments(rows.map(toMeiliJobDocument));
    cursor = rows[rows.length - 1]!.id;
    done += rows.length;
    options?.onProgress?.(done, total);
  }

  return { indexed: done, skipped: false };
}

function buildMeiliFilter(input: {
  workMode?: string[];
  employmentType?: string[];
  seniority?: string[];
  country?: string;
  salaryMin?: number;
  postedAfter?: Date;
}): string {
  const parts = ['isActive = true'];
  if (input.workMode?.length) {
    parts.push(`workMode IN [${input.workMode.map((v) => `"${escapeFilter(v)}"`).join(', ')}]`);
  }
  if (input.employmentType?.length) {
    parts.push(
      `employmentType IN [${input.employmentType.map((v) => `"${escapeFilter(v)}"`).join(', ')}]`,
    );
  }
  if (input.seniority?.length) {
    parts.push(`seniority IN [${input.seniority.map((v) => `"${escapeFilter(v)}"`).join(', ')}]`);
  }
  if (input.country) {
    parts.push(`country = "${escapeFilter(input.country)}"`);
  }
  if (input.salaryMin) {
    parts.push(`salaryMax >= ${Number(input.salaryMin)}`);
  }
  if (input.postedAfter) {
    parts.push(`postedAt > ${input.postedAfter.getTime()}`);
  }
  return parts.join(' AND ');
}

function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export type MeiliSearchHits = {
  ids: string[];
  total: number;
  facets: {
    workMode: JobSearchFacet[];
    employmentType: JobSearchFacet[];
    seniority: JobSearchFacet[];
  };
};

export async function searchMeiliJobIds(input: {
  q: string;
  workMode?: string[];
  employmentType?: string[];
  seniority?: string[];
  country?: string;
  salaryMin?: number;
  postedAfter?: Date;
  sort?: 'relevance' | 'recent' | 'salary';
  limit: number;
  offset: number;
}): Promise<MeiliSearchHits | null> {
  if (!(await meiliReady())) return null;
  await ensureMeiliJobsIndex();
  const index = await getIndex();
  if (!index) return null;

  const sort =
    input.sort === 'recent'
      ? ['postedAt:desc']
      : input.sort === 'salary'
        ? ['salaryMax:desc']
        : undefined;

  const result = await index.search(input.q, {
    filter: buildMeiliFilter(input),
    limit: input.limit,
    offset: input.offset,
    sort,
    facets: ['workMode', 'employmentType', 'seniority'],
  });

  const toFacets = (bucket?: Record<string, number>): JobSearchFacet[] =>
    Object.entries(bucket ?? {})
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

  return {
    ids: result.hits.map((hit) => hit.id),
    total: result.estimatedTotalHits ?? result.hits.length,
    facets: {
      workMode: toFacets(result.facetDistribution?.workMode),
      employmentType: toFacets(result.facetDistribution?.employmentType),
      seniority: toFacets(result.facetDistribution?.seniority),
    },
  };
}
