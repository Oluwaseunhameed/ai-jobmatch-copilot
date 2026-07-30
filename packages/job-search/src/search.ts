import { prisma } from '@jobmatch/database';
import type {
  JobDto,
  JobSearchFacet,
  JobSearchMode,
  JobSearchResponse,
  JobSortOption,
} from '@jobmatch/types';

import { embedQuery } from './embed';
import {
  enrichJobsWithMatch,
  loadProfileSkillNames,
  sortJobsByMatchScore,
} from './match';
import { meiliConfigured, searchMeiliJobIds } from './meili';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;
/** Upper bound when re-ranking a filtered set by profile match in memory. */
const MATCH_RANK_CAP = 500;

/**
 * Reciprocal rank fusion constant. 60 is the value from the original RRF paper
 * and is deliberately large: it flattens the contribution of top ranks so one
 * strategy cannot dominate the other purely by being more confident.
 */
const RRF_K = 60;

/** Cap on the semantic candidate set before fusion. */
const SEMANTIC_CANDIDATES = 200;

/**
 * Maximum cosine distance for a semantic hit to count.
 * With L2-normalised vectors, distance ≈ 1 − similarity. Empirically:
 * related postings land around 0.15–0.35, unrelated noise around 0.55+.
 * Without a floor, hybrid mode returns every embedded job for any query.
 */
const SEMANTIC_MAX_DISTANCE = 0.45;

const JOB_COLUMNS = `
  j."id", j."slug", j."title", j."description", j."responsibilities", j."requirements",
  j."benefits", j."skills", j."employment_type", j."work_mode", j."seniority",
  j."location", j."city", j."country", j."salary_min", j."salary_max",
  j."salary_currency", j."salary_period", j."source", j."source_url", j."apply_url",
  j."posted_at", j."expires_at", j."is_active",
  c."id" AS company_id, c."name" AS company_name, c."slug" AS company_slug,
  c."website_url" AS company_website_url, c."logo_url" AS company_logo_url,
  c."industry" AS company_industry, c."size" AS company_size,
  c."location" AS company_location, c."about" AS company_about`;

const SEARCH_DOC = (alias: string) =>
  `job_search_document(${alias}."title", ${alias}."skills", ${alias}."description", ${alias}."location")`;

/**
 * Collects bind parameters while the SQL string is assembled.
 *
 * The queries below are built as plain strings rather than composed
 * `Prisma.sql` fragments. Nested fragments rely on an `instanceof` check that
 * breaks when the bundler ends up with more than one copy of the Prisma
 * runtime, and the failure mode is silent: every fragment is passed as a bind
 * parameter, producing `syntax error at or near "$3"`. Only whitelisted
 * identifiers are ever interpolated; all user input goes through `add`.
 */
class Params {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  addAll(values: readonly unknown[]): string {
    return values.map((value) => this.add(value)).join(', ');
  }
}

export type SearchJobsInput = {
  q?: string;
  workMode?: string[];
  employmentType?: string[];
  seniority?: string[];
  country?: string;
  salaryMin?: number;
  sort?: JobSortOption;
  page?: number;
  limit?: number;
  /** Only include jobs posted at or after this timestamp (job alerts). */
  postedAfter?: Date;
  /** Marks results the user has already saved and loads profile skills for match. */
  userId?: string;
  /**
   * Optional override for tests. When omitted and `userId` is set, skills are
   * loaded from the viewer's career profile.
   */
  profileSkills?: string[];
  /** Set false to force keyword-only, e.g. for evaluation baselines. */
  semantic?: boolean;
};

type JobRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  employment_type: string;
  work_mode: string;
  seniority: string;
  location: string | null;
  city: string | null;
  country: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: string;
  source: string;
  source_url: string | null;
  apply_url: string | null;
  posted_at: Date;
  expires_at: Date | null;
  is_active: boolean;
  company_id: string;
  company_name: string;
  company_slug: string;
  company_website_url: string | null;
  company_logo_url: string | null;
  company_industry: string | null;
  company_size: string | null;
  company_location: string | null;
  company_about: string | null;
  score: number | null;
  is_saved: boolean;
  total_count: bigint;
};

function toDto(row: JobRow): JobDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    benefits: row.benefits,
    skills: row.skills,
    employmentType: row.employment_type,
    workMode: row.work_mode,
    seniority: row.seniority,
    location: row.location,
    city: row.city,
    country: row.country,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    salaryPeriod: row.salary_period,
    source: row.source,
    sourceUrl: row.source_url,
    applyUrl: row.apply_url,
    postedAt: new Date(row.posted_at).toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    isActive: row.is_active,
    company: {
      id: row.company_id,
      name: row.company_name,
      slug: row.company_slug,
      websiteUrl: row.company_website_url,
      logoUrl: row.company_logo_url,
      industry: row.company_industry,
      size: row.company_size,
      location: row.company_location,
      about: row.company_about,
    },
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    isSaved: Boolean(row.is_saved),
  };
}

function buildWhere(input: SearchJobsInput, params: Params): string {
  const clauses = ['j."is_active" = TRUE'];

  if (input.workMode?.length) {
    clauses.push(`j."work_mode" IN (${params.addAll(input.workMode)})`);
  }
  if (input.employmentType?.length) {
    clauses.push(`j."employment_type" IN (${params.addAll(input.employmentType)})`);
  }
  if (input.seniority?.length) {
    clauses.push(`j."seniority" IN (${params.addAll(input.seniority)})`);
  }
  if (input.country) {
    clauses.push(`j."country" = ${params.add(input.country)}`);
  }
  if (input.salaryMin) {
    // Compare against the top of the band: a range of 90k-130k should match a
    // 120k floor even though its minimum is lower.
    clauses.push(`COALESCE(j."salary_max", j."salary_min") >= ${params.add(input.salaryMin)}`);
  }
  if (input.postedAfter) {
    clauses.push(`j."posted_at" > ${params.add(input.postedAfter)}`);
  }

  return clauses.join(' AND ');
}

/** Fixed set of sort expressions; never built from user input. */
function orderByClause(sort: JobSortOption, ranked: boolean): string {
  switch (sort) {
    case 'recent':
      return 'j."posted_at" DESC, j."id"';
    case 'salary':
      return 'COALESCE(j."salary_max", j."salary_min") DESC NULLS LAST, j."id"';
    case 'match':
      // Match order is applied in memory after skill scoring; SQL stays stable.
      return 'j."posted_at" DESC, j."id"';
    default:
      return ranked ? 'score DESC, j."posted_at" DESC, j."id"' : 'j."posted_at" DESC, j."id"';
  }
}

/**
 * Search jobs.
 *
 * Keyword search is the baseline and always runs when there is a query. Semantic
 * ranking is layered on top when the query can be embedded and postings have
 * vectors; the two are combined with reciprocal rank fusion. When embeddings are
 * unavailable the search still returns keyword results and reports why it
 * degraded, rather than failing.
 */
export async function searchJobs(input: SearchJobsInput): Promise<JobSearchResponse> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT)));
  const offset = (page - 1) * limit;
  const query = input.q?.trim() ?? '';

  const profileSkills =
    input.profileSkills ??
    (input.userId ? await loadProfileSkillNames(input.userId) : []);
  const profileSkillCount = profileSkills.length;

  // Personalised match sort when requested, or when browsing with a profile.
  let sort: JobSortOption = input.sort ?? 'relevance';
  if (sort === 'relevance' && !query && profileSkillCount > 0) {
    sort = 'match';
  }
  const rankByMatch = sort === 'match' && profileSkillCount > 0;

  let mode: JobSearchMode = 'keyword';
  let degradedReason: string | undefined;
  let vector: number[] | null = null;

  if (query && input.semantic !== false) {
    // Keep this short — serverless routes often die at ~10–15s if the AI
    // service is cold. Keyword search is a good fallback within a few seconds.
    const QUERY_EMBED_BUDGET_MS = 2_500;
    vector = await Promise.race([
      embedQuery(query),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), QUERY_EMBED_BUDGET_MS);
      }),
    ]);

    if (vector) {
      const withVectors = await prisma.job.count({
        where: { isActive: true, embeddingStatus: 'ready' },
      });

      if (withVectors === 0) {
        vector = null;
        degradedReason =
          'Showing keyword matches — job embeddings are not generated yet.';
      }
    } else {
      degradedReason =
        'Showing keyword matches — semantic ranking is temporarily unavailable.';
    }
  }

  const params = new Params();

  // The saved-state join has to be registered before the WHERE clause so the
  // bind parameter numbering matches the order they appear in the SQL.
  const savedJoin = input.userId
    ? `LEFT JOIN "job_interactions" si
         ON si."job_id" = j."id" AND si."user_id" = ${params.add(input.userId)} AND si."type" = 'saved'`
    : '';
  const savedSelect = input.userId ? '(si."id" IS NOT NULL)' : 'FALSE';

  const sqlSort: JobSortOption =
    sort === 'match' ? 'recent' : query ? sort : sort === 'relevance' ? 'recent' : sort;
  const order = orderByClause(sqlSort, Boolean(query) && sort !== 'match');
  // When re-ranking by match, pull a capped candidate set then page in memory.
  const fetchLimit = rankByMatch ? MATCH_RANK_CAP : limit;
  const fetchOffset = rankByMatch ? 0 : offset;
  // limit/offset are validated integers above, so inlining avoids the parameter
  // type inference Postgres has to do for LIMIT/OFFSET placeholders.
  const paging = `LIMIT ${fetchLimit} OFFSET ${fetchOffset}`;

  let sql: string;

  if (!query) {
    // Browsing rather than searching: filters and sort only.
    const where = buildWhere(input, params);
    sql = `
      SELECT ${JOB_COLUMNS},
             ${savedSelect} AS is_saved,
             NULL::float8 AS score,
             COUNT(*) OVER () AS total_count
      FROM "jobs" j
      JOIN "companies" c ON c."id" = j."company_id"
      ${savedJoin}
      WHERE ${where}
      ORDER BY ${order}
      ${paging}`;
  } else if (!vector) {
    // Prefer Meilisearch for keyword search when configured and healthy.
    if (meiliConfigured() && !rankByMatch) {
      try {
        const meiliSort =
          sort === 'recent' || sort === 'salary' ? sort : 'relevance';
        const meili = await searchMeiliJobIds({
          q: query,
          workMode: input.workMode,
          employmentType: input.employmentType,
          seniority: input.seniority,
          country: input.country,
          salaryMin: input.salaryMin,
          postedAfter: input.postedAfter,
          sort: meiliSort,
          limit,
          offset,
        });
        if (meili) {
          const jobs = enrichJobsWithMatch(
            await hydrateJobsByIds(meili.ids, input.userId),
            profileSkills,
          );
          return {
            jobs,
            total: meili.total,
            page,
            limit,
            mode: 'keyword',
            degradedReason,
            profileSkillCount,
            facets: meili.facets,
          };
        }
      } catch {
        degradedReason =
          degradedReason ??
          'Meilisearch unavailable; falling back to Postgres full-text search.';
      }
    }

    const where = buildWhere(input, params);
    const q = params.add(query);
    sql = `
      WITH matched AS (
        SELECT j."id",
               ts_rank(${SEARCH_DOC('j')}, plainto_tsquery('english', ${q})) AS score
        FROM "jobs" j
        WHERE ${where}
          AND ${SEARCH_DOC('j')} @@ plainto_tsquery('english', ${q})
      )
      SELECT ${JOB_COLUMNS},
             ${savedSelect} AS is_saved,
             m.score::float8 AS score,
             COUNT(*) OVER () AS total_count
      FROM matched m
      JOIN "jobs" j ON j."id" = m."id"
      JOIN "companies" c ON c."id" = j."company_id"
      ${savedJoin}
      ORDER BY ${order}
      ${paging}`;
  } else {
    mode = 'hybrid';
    const where = buildWhere(input, params);
    const q = params.add(query);
    const vec = params.add(`[${vector.join(',')}]`);

    sql = `
      WITH candidates AS (
        SELECT j."id", j."title", j."skills", j."description", j."location", j."embedding"
        FROM "jobs" j
        WHERE ${where}
      ),
      keyword AS (
        SELECT k."id",
               ROW_NUMBER() OVER (
                 ORDER BY ts_rank(${SEARCH_DOC('k')}, plainto_tsquery('english', ${q})) DESC, k."id"
               ) AS rnk
        FROM candidates k
        WHERE ${SEARCH_DOC('k')} @@ plainto_tsquery('english', ${q})
      ),
      semantic AS (
        SELECT s."id",
               ROW_NUMBER() OVER (ORDER BY s."distance", s."id") AS rnk
        FROM (
          SELECT c2."id", (c2."embedding" <=> ${vec}::vector) AS distance
          FROM candidates c2
          WHERE c2."embedding" IS NOT NULL
            AND (c2."embedding" <=> ${vec}::vector) < ${SEMANTIC_MAX_DISTANCE}
          ORDER BY c2."embedding" <=> ${vec}::vector
          LIMIT ${SEMANTIC_CANDIDATES}
        ) s
      ),
      fused AS (
        SELECT COALESCE(k."id", s."id") AS id,
               COALESCE(1.0 / (${RRF_K} + k.rnk), 0) + COALESCE(1.0 / (${RRF_K} + s.rnk), 0) AS score
        FROM keyword k
        FULL OUTER JOIN semantic s ON s."id" = k."id"
      )
      SELECT ${JOB_COLUMNS},
             ${savedSelect} AS is_saved,
             f.score::float8 AS score,
             COUNT(*) OVER () AS total_count
      FROM fused f
      JOIN "jobs" j ON j."id" = f."id"
      JOIN "companies" c ON c."id" = j."company_id"
      ${savedJoin}
      ORDER BY ${order}
      ${paging}`;
  }

  let rows: JobRow[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<JobRow[]>(sql, ...params.values);
  } catch (error) {
    // FTS / pooler blips should not hard-fail the Jobs page.
    if (!query) throw error;
    const fallbackParams = new Params();
    const savedJoinFb = input.userId
      ? `LEFT JOIN "job_interactions" si
           ON si."job_id" = j."id" AND si."user_id" = ${fallbackParams.add(input.userId)} AND si."type" = 'saved'`
      : '';
    const savedSelectFb = input.userId ? '(si."id" IS NOT NULL)' : 'FALSE';
    const whereFb = buildWhere(input, fallbackParams);
    const like = fallbackParams.add(`%${query}%`);
    const fallbackSql = `
      SELECT ${JOB_COLUMNS},
             ${savedSelectFb} AS is_saved,
             NULL::float8 AS score,
             COUNT(*) OVER () AS total_count
      FROM "jobs" j
      JOIN "companies" c ON c."id" = j."company_id"
      ${savedJoinFb}
      WHERE ${whereFb}
        AND (
          j."title" ILIKE ${like}
          OR c."name" ILIKE ${like}
          OR COALESCE(j."location", '') ILIKE ${like}
          OR array_to_string(j."skills", ' ') ILIKE ${like}
        )
      ORDER BY ${orderByClause('recent', false)}
      ${paging}`;
    rows = await prisma.$queryRawUnsafe<JobRow[]>(fallbackSql, ...fallbackParams.values);
    degradedReason =
      degradedReason ??
      'Full-text search hit a temporary error; showing broader keyword matches instead.';
    mode = 'keyword';
  }

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  let facets: JobSearchResponse['facets'] = {
    workMode: [],
    employmentType: [],
    seniority: [],
  };
  try {
    facets = await loadFacets(input, query);
  } catch {
    // Keep empty facets rather than failing the whole search.
  }

  let jobs = enrichJobsWithMatch(rows.map(toDto), profileSkills);

  if (rankByMatch) {
    jobs = sortJobsByMatchScore(jobs).slice(offset, offset + limit);
  }

  return {
    jobs,
    total,
    page,
    limit,
    mode,
    degradedReason,
    profileSkillCount,
    facets,
  };
}

/**
 * Facet counts over the filtered set.
 *
 * Counts respect the active filters, so they answer "how many of these results
 * are remote" rather than "how many jobs exist".
 */
async function loadFacets(
  input: SearchJobsInput,
  query: string,
): Promise<JobSearchResponse['facets']> {
  const params = new Params();
  const where = buildWhere(input, params);
  const textFilter = query
    ? ` AND ${SEARCH_DOC('j')} @@ plainto_tsquery('english', ${params.add(query)})`
    : '';

  const dimension = (label: string, column: string) => `
    SELECT '${label}' AS dimension, j."${column}" AS value, COUNT(*) AS count
    FROM "jobs" j WHERE ${where}${textFilter} GROUP BY j."${column}"`;

  const sql = [
    dimension('workMode', 'work_mode'),
    dimension('employmentType', 'employment_type'),
    dimension('seniority', 'seniority'),
  ].join('\nUNION ALL\n');

  const rows = await prisma.$queryRawUnsafe<{ dimension: string; value: string; count: bigint }[]>(
    sql,
    ...params.values,
  );

  const group = (name: string): JobSearchFacet[] =>
    rows
      .filter((row) => row.dimension === name)
      .map((row) => ({ value: row.value, count: Number(row.count) }))
      .sort((a, b) => b.count - a.count);

  return {
    workMode: group('workMode'),
    employmentType: group('employmentType'),
    seniority: group('seniority'),
  };
}

/** Load jobs by id list, preserving Meilisearch hit order. */
async function hydrateJobsByIds(ids: string[], userId?: string): Promise<JobDto[]> {
  if (!ids.length) return [];

  const rows = await prisma.job.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { company: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  let savedIds = new Set<string>();
  if (userId) {
    const saved = await prisma.jobInteraction.findMany({
      where: { userId, type: 'saved', jobId: { in: ids } },
      select: { jobId: true },
    });
    savedIds = new Set(saved.map((row) => row.jobId));
  }

  return ids
    .map((id) => byId.get(id))
    .filter((job): job is NonNullable<typeof job> => Boolean(job))
    .map((job) => ({
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      benefits: job.benefits,
      skills: job.skills,
      employmentType: job.employmentType,
      workMode: job.workMode,
      seniority: job.seniority,
      location: job.location,
      city: job.city,
      country: job.country,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      source: job.source,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      postedAt: job.postedAt.toISOString(),
      expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
      isActive: job.isActive,
      company: {
        id: job.company.id,
        name: job.company.name,
        slug: job.company.slug,
        websiteUrl: job.company.websiteUrl,
        logoUrl: job.company.logoUrl,
        industry: job.company.industry,
        size: job.company.size,
        location: job.company.location,
        about: job.company.about,
      },
      isSaved: savedIds.has(job.id),
    }));
}

/** A single posting by slug, with the viewer's saved state and skill match. */
export async function getJobBySlug(slug: string, userId?: string): Promise<JobDto | null> {
  const job = await prisma.job.findUnique({
    where: { slug },
    include: { company: true },
  });

  if (!job) return null;

  let isSaved = false;
  let profileSkills: string[] = [];
  if (userId) {
    const [saved, skills] = await Promise.all([
      prisma.jobInteraction.findUnique({
        where: { userId_jobId_type: { userId, jobId: job.id, type: 'saved' } },
        select: { id: true },
      }),
      loadProfileSkillNames(userId),
    ]);
    isSaved = Boolean(saved);
    profileSkills = skills;
  }

  const dto: JobDto = {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    benefits: job.benefits,
    skills: job.skills,
    employmentType: job.employmentType,
    workMode: job.workMode,
    seniority: job.seniority,
    location: job.location,
    city: job.city,
    country: job.country,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    source: job.source,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt.toISOString(),
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
    isActive: job.isActive,
    company: {
      id: job.company.id,
      name: job.company.name,
      slug: job.company.slug,
      websiteUrl: job.company.websiteUrl,
      logoUrl: job.company.logoUrl,
      industry: job.company.industry,
      size: job.company.size,
      location: job.company.location,
      about: job.company.about,
    },
    isSaved,
  };

  return enrichJobsWithMatch([dto], profileSkills)[0] ?? dto;
}
