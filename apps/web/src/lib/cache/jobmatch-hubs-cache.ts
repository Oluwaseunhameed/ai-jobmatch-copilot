import { prisma } from '@jobmatch/database';
import {
  getCareerGrowthHub,
  getNetworkingHub,
  getPortfolioBrief,
  getTrendingJobs,
  getUserAnalytics,
  listCoachSessions,
  listCodingSessions,
  listInterviewPreps,
  listNotifications,
  loadProfileSkillNames,
  searchJobs,
} from '@jobmatch/job-search';
import type { PlanId, UserAnalyticsDto } from '@jobmatch/types';

import type {
  CareerCoachSession,
  CareerGrowthHub,
  CodingPracticeSession,
  InterviewPrep,
  NetworkingHub,
  NotificationsResponse,
  PortfolioBrief,
} from '@/lib/api-client';
import { getCurrentPlanId } from '@/lib/plan';

import { invalidateRedisKeys, withRedisJsonCache } from './redis-ttl-cache';

/** Stable hub summaries — safe to reuse across navigations for ~90s. */
const HUB_TTL_SECONDS = 90;
/** Lists that change more often (applications, resumes, profile). */
const LIST_TTL_SECONDS = 45;
/** Job search / trending — short because catalog changes frequently. */
const JOBS_TTL_SECONDS = 30;
/** Notification polls — short so unread badges stay reasonably fresh. */
const NOTIFICATIONS_TTL_SECONDS = 20;
/** Full dashboard snapshot. */
const DASHBOARD_TTL_SECONDS = 60;

export const cacheKeys = {
  authUser: (userId: string) => `web:auth:user:${userId}`,
  careerGrowthHub: (userId: string) => `web:careerGrowthHub:${userId}`,
  portfolioBrief: (userId: string) => `web:portfolioBrief:${userId}`,
  networkingHub: (userId: string) => `web:networkingHub:${userId}`,
  interviewPreps: (userId: string) => `web:interviewPreps:${userId}`,
  codingSessions: (userId: string) => `web:codingSessions:${userId}`,
  coachSessions: (userId: string) => `web:coachSessions:${userId}`,
  userAnalytics: (userId: string, weeks: number) => `web:userAnalytics:${userId}:${weeks}`,
  dashboard: (userId: string) => `web:dashboard:${userId}`,
  applications: (userId: string) => `web:applications:${userId}`,
  resumes: (userId: string) => `web:resumes:${userId}`,
  profile: (userId: string) => `web:profile:${userId}`,
  preferences: (userId: string) => `web:preferences:${userId}`,
  jobSearch: (userId: string, queryKey: string) => `web:jobSearch:${userId}:${queryKey}`,
  trendingJobs: (userId: string, days: number, limit: number) =>
    `web:trendingJobs:${userId}:${days}:${limit}`,
  notifications: (userId: string, unreadOnly: boolean, limit: number) =>
    `web:notifications:${userId}:${unreadOnly ? 'unread' : 'all'}:${limit}`,
};

function toJsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type DashboardSnapshot = {
  profile: {
    completenessScore: number;
    headline?: string | null;
    skills: Array<{ name: string }>;
    [key: string]: unknown;
  } | null;
  resumeCount: number;
  primaryResume: { id: string; title: string; [key: string]: unknown } | null;
  savedCount: number;
  viewedCount: number;
  applicationCount: number;
  applicationsByStage: Array<{ stage: string; _count: { _all: number } }>;
  recentApplications: Array<{
    id: string;
    stage: string;
    updatedAt: string;
    job: { title: string; slug: string; company: { name: string }; [key: string]: unknown };
    [key: string]: unknown;
  }>;
  recentSavedRows: Array<{
    createdAt: string;
    job: {
      id: string;
      slug: string;
      title: string;
      skills: string[];
      company: { name: string };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  lastInteraction: { createdAt: string; type: string } | null;
  openJobs: number;
  profileSkills: string[];
  planId: PlanId;
  analytics: UserAnalyticsDto | null;
};

async function loadDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const [
    profile,
    resumeCount,
    primaryResume,
    savedCount,
    viewedCount,
    applicationCount,
    applicationsByStage,
    recentApplications,
    recentSavedRows,
    lastInteraction,
    openJobs,
    profileSkills,
    planId,
    analytics,
  ] = await Promise.all([
    prisma.careerProfile.findUnique({
      where: { userId },
      include: { skills: true },
    }),
    prisma.resume.count({ where: { userId } }),
    prisma.resume.findFirst({ where: { userId, isPrimary: true } }),
    prisma.jobInteraction.count({ where: { userId, type: 'saved' } }),
    prisma.jobInteraction.count({ where: { userId, type: 'viewed' } }),
    prisma.application.count({ where: { userId } }),
    prisma.application.groupBy({
      by: ['stage'],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { job: { include: { company: true } } },
    }),
    prisma.jobInteraction.findMany({
      where: { userId, type: 'saved' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { job: { include: { company: true } } },
    }),
    prisma.jobInteraction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, type: true },
    }),
    prisma.job.count({ where: { isActive: true } }),
    loadProfileSkillNames(userId),
    getCurrentPlanId(userId),
    getUserAnalytics(userId, 8),
  ]);

  return toJsonClone({
    profile,
    resumeCount,
    primaryResume,
    savedCount,
    viewedCount,
    applicationCount,
    applicationsByStage,
    recentApplications,
    recentSavedRows,
    lastInteraction,
    openJobs,
    profileSkills,
    planId,
    analytics,
  }) as unknown as DashboardSnapshot;
}

export async function getCachedDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  return withRedisJsonCache({
    key: cacheKeys.dashboard(userId),
    ttlSeconds: DASHBOARD_TTL_SECONDS,
    compute: () => loadDashboardSnapshot(userId),
  });
}

export async function getCachedCareerGrowthHub(userId: string): Promise<CareerGrowthHub> {
  return withRedisJsonCache<CareerGrowthHub>({
    key: cacheKeys.careerGrowthHub(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => getCareerGrowthHub(userId) as unknown as CareerGrowthHub,
  });
}

export async function getCachedPortfolioBrief(userId: string): Promise<PortfolioBrief> {
  return withRedisJsonCache<PortfolioBrief>({
    key: cacheKeys.portfolioBrief(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => getPortfolioBrief(userId) as unknown as PortfolioBrief,
  });
}

export async function getCachedNetworkingHub(userId: string): Promise<NetworkingHub> {
  return withRedisJsonCache<NetworkingHub>({
    key: cacheKeys.networkingHub(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => getNetworkingHub(userId) as unknown as NetworkingHub,
  });
}

export async function getCachedInterviewPreps(userId: string): Promise<InterviewPrep[]> {
  return withRedisJsonCache<InterviewPrep[]>({
    key: cacheKeys.interviewPreps(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => listInterviewPreps(userId) as unknown as InterviewPrep[],
  });
}

export async function getCachedCodingSessions(userId: string): Promise<CodingPracticeSession[]> {
  return withRedisJsonCache<CodingPracticeSession[]>({
    key: cacheKeys.codingSessions(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => listCodingSessions(userId) as unknown as CodingPracticeSession[],
  });
}

export async function getCachedCoachSessions(userId: string): Promise<CareerCoachSession[]> {
  return withRedisJsonCache<CareerCoachSession[]>({
    key: cacheKeys.coachSessions(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => listCoachSessions(userId) as unknown as CareerCoachSession[],
  });
}

export async function getCachedUserAnalytics(
  userId: string,
  weeks = 8,
): Promise<UserAnalyticsDto> {
  return withRedisJsonCache<UserAnalyticsDto>({
    key: cacheKeys.userAnalytics(userId, weeks),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: () => getUserAnalytics(userId, weeks),
  });
}

export async function getCachedNotifications(input: {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationsResponse> {
  const unreadOnly = Boolean(input.unreadOnly);
  const limit = input.limit ?? 20;
  return withRedisJsonCache<NotificationsResponse>({
    key: cacheKeys.notifications(input.userId, unreadOnly, limit),
    ttlSeconds: NOTIFICATIONS_TTL_SECONDS,
    compute: async () =>
      listNotifications({
        userId: input.userId,
        unreadOnly,
        limit,
      }) as unknown as NotificationsResponse,
  });
}

export async function getCachedApplicationsJson<T>(
  userId: string,
  compute: () => Promise<T>,
): Promise<T> {
  return withRedisJsonCache<T>({
    key: cacheKeys.applications(userId),
    ttlSeconds: LIST_TTL_SECONDS,
    compute: async () => toJsonClone(await compute()),
  });
}

export async function getCachedResumesJson<T>(
  userId: string,
  compute: () => Promise<T>,
): Promise<T> {
  return withRedisJsonCache<T>({
    key: cacheKeys.resumes(userId),
    ttlSeconds: LIST_TTL_SECONDS,
    compute: async () => toJsonClone(await compute()),
  });
}

export async function getCachedProfileJson<T>(
  userId: string,
  compute: () => Promise<T>,
): Promise<T> {
  return withRedisJsonCache<T>({
    key: cacheKeys.profile(userId),
    ttlSeconds: LIST_TTL_SECONDS,
    compute: async () => toJsonClone(await compute()),
  });
}

export async function getCachedPreferencesJson<T>(
  userId: string,
  compute: () => Promise<T>,
): Promise<T> {
  return withRedisJsonCache<T>({
    key: cacheKeys.preferences(userId),
    ttlSeconds: HUB_TTL_SECONDS,
    compute: async () => toJsonClone(await compute()),
  });
}

export async function getCachedJobSearch<T>(
  userId: string,
  queryKey: string,
  compute: () => Promise<T>,
): Promise<T> {
  return withRedisJsonCache<T>({
    key: cacheKeys.jobSearch(userId, queryKey),
    ttlSeconds: JOBS_TTL_SECONDS,
    compute: async () => toJsonClone(await compute()),
  });
}

export async function getCachedTrendingJobs(input: {
  userId: string;
  days?: number;
  limit?: number;
}) {
  const days = input.days ?? 14;
  const limit = input.limit ?? 6;
  return withRedisJsonCache({
    key: cacheKeys.trendingJobs(input.userId, days, limit),
    ttlSeconds: JOBS_TTL_SECONDS,
    compute: async () =>
      toJsonClone(
        await getTrendingJobs({
          days,
          limit,
          userId: input.userId,
        }),
      ),
  });
}

export { searchJobs };

export async function invalidateCareerGrowthCache(userId: string) {
  await invalidateRedisKeys(
    cacheKeys.careerGrowthHub(userId),
    cacheKeys.portfolioBrief(userId),
    cacheKeys.coachSessions(userId),
    cacheKeys.profile(userId),
    cacheKeys.dashboard(userId),
  );
}

export async function invalidatePortfolioCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.portfolioBrief(userId), cacheKeys.dashboard(userId));
}

export async function invalidateNetworkingCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.networkingHub(userId));
}

export async function invalidateInterviewCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.interviewPreps(userId));
}

export async function invalidateCodingCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.codingSessions(userId));
}

export async function invalidateCoachCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.coachSessions(userId));
}

export async function invalidateApplicationsCache(userId: string) {
  await invalidateRedisKeys(
    cacheKeys.applications(userId),
    cacheKeys.userAnalytics(userId, 8),
    cacheKeys.dashboard(userId),
  );
}

export async function invalidateResumesCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.resumes(userId), cacheKeys.dashboard(userId));
}

export async function invalidateProfileCache(userId: string) {
  await invalidateRedisKeys(
    cacheKeys.profile(userId),
    cacheKeys.careerGrowthHub(userId),
    cacheKeys.portfolioBrief(userId),
    cacheKeys.coachSessions(userId),
    cacheKeys.dashboard(userId),
  );
}

export async function invalidateNotificationsCache(userId: string) {
  await invalidateRedisKeys(
    cacheKeys.notifications(userId, false, 20),
    cacheKeys.notifications(userId, true, 20),
    cacheKeys.notifications(userId, false, 50),
  );
}

export async function invalidateAuthUserCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.authUser(userId), cacheKeys.preferences(userId));
}

export async function invalidatePreferencesCache(userId: string) {
  await invalidateRedisKeys(cacheKeys.preferences(userId), cacheKeys.authUser(userId));
}
