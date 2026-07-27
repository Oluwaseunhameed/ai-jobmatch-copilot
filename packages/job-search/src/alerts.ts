import { jobAlertEmail, sendEmailAsync } from '@jobmatch/email';
import { prisma } from '@jobmatch/database';
import type { JobSortOption, SavedSearchQuery } from '@jobmatch/types';

import { createLogger, type StructuredLogger } from './logger';
import { searchJobs } from './search';

const SORTS = new Set<JobSortOption>(['relevance', 'recent', 'salary', 'match']);

export function parseSavedSearchQuery(raw: unknown): SavedSearchQuery {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data = raw as Record<string, unknown>;

  const stringList = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  };

  const sort =
    typeof data.sort === 'string' && SORTS.has(data.sort as JobSortOption)
      ? (data.sort as JobSortOption)
      : undefined;

  const salaryMin =
    typeof data.salaryMin === 'number' && Number.isFinite(data.salaryMin) && data.salaryMin > 0
      ? Math.trunc(data.salaryMin)
      : undefined;

  return {
    q: typeof data.q === 'string' && data.q.trim() ? data.q.trim() : undefined,
    workMode: stringList(data.workMode),
    employmentType: stringList(data.employmentType),
    seniority: stringList(data.seniority),
    country:
      typeof data.country === 'string' && data.country.trim()
        ? data.country.trim()
        : undefined,
    salaryMin,
    sort,
  };
}

export function normalizeSavedSearchQuery(input: SavedSearchQuery): SavedSearchQuery {
  return parseSavedSearchQuery(input);
}

export function savedSearchHasFilters(query: SavedSearchQuery) {
  return Boolean(
    query.q ||
      query.workMode?.length ||
      query.employmentType?.length ||
      query.seniority?.length ||
      query.country ||
      query.salaryMin ||
      query.sort,
  );
}

export function labelSavedSearchQuery(query: SavedSearchQuery) {
  const parts: string[] = [];
  if (query.q) parts.push(`“${query.q}”`);
  if (query.workMode?.length) parts.push(query.workMode.join('/'));
  if (query.seniority?.length) parts.push(query.seniority.join('/'));
  if (query.employmentType?.length) parts.push(query.employmentType.join('/'));
  if (query.country) parts.push(query.country);
  if (query.salaryMin) parts.push(`≥ ${query.salaryMin}`);
  return parts.length ? parts.join(' · ') : 'All open roles';
}

export function toSavedSearchDto(row: {
  id: string;
  name: string;
  query: unknown;
  alertEnabled: boolean;
  lastAlertAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    query: parseSavedSearchQuery(row.query),
    alertEnabled: row.alertEnabled,
    lastAlertAt: row.lastAlertAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function defaultLookbackDate() {
  const daysRaw = Number(process.env.JOB_ALERT_LOOKBACK_DAYS);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 3;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function minIntervalMs() {
  const hoursRaw = Number(process.env.JOB_ALERT_MIN_INTERVAL_HOURS);
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 20;
  return hours * 60 * 60 * 1000;
}

/**
 * Sweep alert-enabled saved searches and email new matching jobs.
 * Gated by UserPreference.emailJobAlerts. Caps batch size for safety.
 */
export async function runJobAlerts(input?: {
  limit?: number;
  logger?: StructuredLogger;
}) {
  const logger = input?.logger ?? createLogger('job-alerts');
  const limit = input?.limit ?? 40;
  const intervalMs = minIntervalMs();
  const cooldownBefore = new Date(Date.now() - intervalMs);
  const lookback = defaultLookbackDate();

  const rows = await prisma.savedSearch.findMany({
    where: {
      alertEnabled: true,
      OR: [{ lastAlertAt: null }, { lastAlertAt: { lte: cooldownBefore } }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          preferences: { select: { emailJobAlerts: true } },
        },
      },
    },
    orderBy: [{ lastAlertAt: 'asc' }, { createdAt: 'asc' }],
    take: limit * 2,
  });

  const candidates = rows
    .filter((row) => row.user.preferences?.emailJobAlerts ?? true)
    .slice(0, limit);
  let sent = 0;
  let matched = 0;

  for (const row of candidates) {
    const query = parseSavedSearchQuery(row.query);
    const postedAfter = row.lastAlertAt ?? lookback;

    try {
      const result = await searchJobs({
        ...query,
        sort: query.sort ?? 'recent',
        postedAfter,
        page: 1,
        limit: 5,
        userId: row.userId,
        semantic: Boolean(query.q),
      });

      if (result.total === 0 || result.jobs.length === 0) {
        await prisma.savedSearch.update({
          where: { id: row.id },
          data: { lastAlertAt: new Date() },
        });
        continue;
      }

      matched += 1;
      const jobs = result.jobs.map((job) => ({
        title: job.title,
        companyName: job.company.name,
        slug: job.slug,
        location: job.location,
      }));

      const payload = jobAlertEmail({
        name: row.user.name,
        searchName: row.name,
        total: result.total,
        jobs,
      });
      sendEmailAsync({ to: row.user.email, ...payload });

      await prisma.savedSearch.update({
        where: { id: row.id },
        data: { lastAlertAt: new Date() },
      });
      sent += 1;
      logger.log('info', 'alert.sent', {
        savedSearchId: row.id,
        userId: row.userId,
        total: result.total,
      });
    } catch (error) {
      logger.log('error', 'alert.failed', {
        savedSearchId: row.id,
        userId: row.userId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.log('info', 'alerts.completed', {
    candidates: candidates.length,
    matched,
    sent,
  });

  return { candidates: candidates.length, matched, sent };
}
