import { prisma } from '@jobmatch/database';
import type {
  JobDto,
  JobSearchFacet,
  JobSearchMode,
  JobSearchResponse,
  JobSortOption,
} from '@jobmatch/types';

import { embedQuery } from './embed';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

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
  /** Marks results the user has already saved. */
  userId?: string;
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

  return clauses.join(' AND ');
}

/** Fixed set of sort expressions; never built from user input. */
function orderByClause(sort: JobSortOption, ranked: boolean): string {
  switch (sort) {
    case 'recent':
      return 'j."posted_at" DESC, j."id"';
    case 'salary':
      return 'COALESCE(j."salary_max", j."salary_min") DESC NULLS LAST, j."id"';
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
  const sort: JobSortOption = input.sort ?? 'relevance';
  const query = input.q?.trim() ?? '';

  let mode: JobSearchMode = 'keyword';
  let degradedReason: string | undefined;
  let vector: number[] | null = null;

  if (query && input.semantic !== false) {
    vector = await embedQuery(query);

    if (vector) {
      const withVectors = await prisma.job.count({
        where: { isActive: true, embeddingStatus: 'ready' },
      });

      if (withVectors === 0) {
        vector = null;
        degradedReason = 'No job embeddings yet. Run "pnpm jobs:embed" to enable semantic search.';
      }
    } else {
      degradedReason =
        'Semantic search is unavailable, so these are keyword matches. Check that the AI service is running.';
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

  const order = orderByClause(
    query ? sort : sort === 'relevance' ? 'recent' : sort,
    Boolean(query),
  );
  // limit/offset are validated integers above, so inlining avoids the parameter
  // type inference Postgres has to do for LIMIT/OFFSET placeholders.
  const paging = `LIMIT ${limit} OFFSET ${offset}`;

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
    const where = buildWhere(input, params);
    const q = params.add(query);
    sql = `
      WITH matched AS (
        SELECT j."id",
               ts_rank(${SEARCH_DOC('j')}, websearch_to_tsquery('english', ${q})) AS score
        FROM "jobs" j
        WHERE ${where}
          AND ${SEARCH_DOC('j')} @@ websearch_to_tsquery('english', ${q})
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
                 ORDER BY ts_rank(${SEARCH_DOC('k')}, websearch_to_tsquery('english', ${q})) DESC, k."id"
               ) AS rnk
        FROM candidates k
        WHERE ${SEARCH_DOC('k')} @@ websearch_to_tsquery('english', ${q})
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

  const rows = await prisma.$queryRawUnsafe<JobRow[]>(sql, ...params.values);
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const facets = await loadFacets(input, query);

  return {
    jobs: rows.map(toDto),
    total,
    page,
    limit,
    mode,
    degradedReason,
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
    ? ` AND ${SEARCH_DOC('j')} @@ websearch_to_tsquery('english', ${params.add(query)})`
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

/** A single posting by slug, with the viewer's saved state. */
export async function getJobBySlug(slug: string, userId?: string): Promise<JobDto | null> {
  const job = await prisma.job.findUnique({
    where: { slug },
    include: { company: true },
  });

  if (!job) return null;

  let isSaved = false;
  if (userId) {
    const saved = await prisma.jobInteraction.findUnique({
      where: { userId_jobId_type: { userId, jobId: job.id, type: 'saved' } },
      select: { id: true },
    });
    isSaved = Boolean(saved);
  }

  return {
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
}
