import { prisma } from '@jobmatch/database';
import type {
  AdminAnalyticsDto,
  AnalyticsSeriesPoint,
  ApplicationStage,
  UserAnalyticsDto,
} from '@jobmatch/types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function weekKey(date: Date): string {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7 style week start Monday
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function buildWeekBuckets(weeks: number): string[] {
  const keys: string[] = [];
  const now = startOfUtcDay(new Date());
  const day = now.getUTCDay() || 7;
  if (day !== 1) now.setUTCDate(now.getUTCDate() - (day - 1));
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * WEEK_MS);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function toSeries(keys: string[], counts: Map<string, number>): AnalyticsSeriesPoint[] {
  return keys.map((week) => ({ week, count: counts.get(week) ?? 0 }));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function getUserAnalytics(
  userId: string,
  weeks = 8,
): Promise<UserAnalyticsDto> {
  const since = new Date(Date.now() - weeks * WEEK_MS);
  const keys = buildWeekBuckets(weeks);

  const [applications, interactions, stageRows] = await Promise.all([
    prisma.application.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, stage: true },
    }),
    prisma.jobInteraction.findMany({
      where: { userId, createdAt: { gte: since }, type: { in: ['saved', 'viewed'] } },
      select: { createdAt: true, type: true },
    }),
    prisma.application.groupBy({
      by: ['stage'],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const apps = new Map<string, number>();
  const saves = new Map<string, number>();
  const views = new Map<string, number>();

  for (const row of applications) bump(apps, weekKey(row.createdAt));
  for (const row of interactions) {
    if (row.type === 'saved') bump(saves, weekKey(row.createdAt));
    if (row.type === 'viewed') bump(views, weekKey(row.createdAt));
  }

  const stageCount = new Map(
    stageRows.map((row) => [row.stage as ApplicationStage, row._count._all]),
  );

  const pipeline: UserAnalyticsDto['pipeline'] = [
    {
      stage: 'preparing',
      label: 'Preparing',
      count: (stageCount.get('saved') ?? 0) + (stageCount.get('preparing') ?? 0),
    },
    {
      stage: 'applied',
      label: 'Applied',
      count: stageCount.get('applied') ?? 0,
    },
    {
      stage: 'interview',
      label: 'Interview',
      count:
        (stageCount.get('assessment') ?? 0) +
        (stageCount.get('hr_interview') ?? 0) +
        (stageCount.get('technical_interview') ?? 0) +
        (stageCount.get('final_interview') ?? 0),
    },
    {
      stage: 'offer',
      label: 'Offer',
      count: (stageCount.get('offer') ?? 0) + (stageCount.get('accepted') ?? 0),
    },
    {
      stage: 'closed',
      label: 'Closed',
      count: stageCount.get('rejected') ?? 0,
    },
  ];

  return {
    weeks,
    applicationsOverTime: toSeries(keys, apps),
    savesOverTime: toSeries(keys, saves),
    viewsOverTime: toSeries(keys, views),
    pipeline,
  };
}

export async function getAdminAnalytics(weeks = 8): Promise<AdminAnalyticsDto> {
  const since = new Date(Date.now() - weeks * WEEK_MS);
  const keys = buildWeekBuckets(weeks);

  const [users, applications, jobs, proSubs] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.application.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.job.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.subscription.findMany({
      where: {
        planId: 'pro',
        status: { in: ['active', 'on_trial'] },
        updatedAt: { gte: since },
      },
      select: { updatedAt: true },
    }),
  ]);

  const signups = new Map<string, number>();
  const apps = new Map<string, number>();
  const catalog = new Map<string, number>();
  const pros = new Map<string, number>();

  for (const row of users) bump(signups, weekKey(row.createdAt));
  for (const row of applications) bump(apps, weekKey(row.createdAt));
  for (const row of jobs) bump(catalog, weekKey(row.createdAt));
  for (const row of proSubs) bump(pros, weekKey(row.updatedAt));

  return {
    weeks,
    signupsOverTime: toSeries(keys, signups),
    applicationsOverTime: toSeries(keys, apps),
    jobsAddedOverTime: toSeries(keys, catalog),
    proConversionsOverTime: toSeries(keys, pros),
  };
}
