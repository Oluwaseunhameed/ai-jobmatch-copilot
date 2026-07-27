import { prisma } from '@jobmatch/database';
import type { TrendingJobDto } from '@jobmatch/types';

import { applySkillMatch, loadProfileSkillNames } from './match';

const DEFAULT_DAYS = 14;
const DEFAULT_LIMIT = 8;

type TrendRow = {
  id: string;
  slug: string;
  title: string;
  company_name: string;
  work_mode: string;
  location: string | null;
  posted_at: Date;
  skills: string[];
  save_count: bigint;
  view_count: bigint;
  trend_score: number;
};

/**
 * Rank active jobs by recent save/view interaction volume.
 * Saves weigh more than views. Falls back to newest posts when activity is sparse.
 */
export async function getTrendingJobs(input?: {
  days?: number;
  limit?: number;
  userId?: string;
}): Promise<TrendingJobDto[]> {
  const days = input?.days && input.days > 0 ? input.days : DEFAULT_DAYS;
  const limit = Math.min(Math.max(input?.limit ?? DEFAULT_LIMIT, 1), 24);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRawUnsafe<TrendRow[]>(
    `
    SELECT
      j."id",
      j."slug",
      j."title",
      c."name" AS company_name,
      j."work_mode",
      j."location",
      j."posted_at",
      j."skills",
      COUNT(*) FILTER (WHERE i."type" = 'saved' AND i."created_at" >= $1)::bigint AS save_count,
      COUNT(*) FILTER (WHERE i."type" = 'viewed' AND i."created_at" >= $1)::bigint AS view_count,
      (
        COALESCE(COUNT(*) FILTER (WHERE i."type" = 'saved' AND i."created_at" >= $1), 0) * 3
        + COALESCE(COUNT(*) FILTER (WHERE i."type" = 'viewed' AND i."created_at" >= $1), 0)
      )::float AS trend_score
    FROM "jobs" j
    INNER JOIN "companies" c ON c."id" = j."company_id"
    LEFT JOIN "job_interactions" i ON i."job_id" = j."id"
    WHERE j."is_active" = TRUE
    GROUP BY j."id", c."name"
    ORDER BY trend_score DESC, j."posted_at" DESC
    LIMIT $2
    `,
    since,
    limit,
  );

  const profileSkills = input?.userId ? await loadProfileSkillNames(input.userId) : [];

  return rows.map((row) => {
    const base = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      companyName: row.company_name,
      workMode: row.work_mode,
      location: row.location,
      postedAt: new Date(row.posted_at).toISOString(),
      saveCount: Number(row.save_count),
      viewCount: Number(row.view_count),
      trendScore: Number(row.trend_score),
      skills: row.skills,
    };
    const withMatch = applySkillMatch(base, profileSkills);
    return {
      id: withMatch.id,
      slug: withMatch.slug,
      title: withMatch.title,
      companyName: withMatch.companyName,
      workMode: withMatch.workMode,
      location: withMatch.location,
      postedAt: withMatch.postedAt,
      saveCount: withMatch.saveCount,
      viewCount: withMatch.viewCount,
      trendScore: withMatch.trendScore,
      matchScore: withMatch.matchScore,
    };
  });
}
