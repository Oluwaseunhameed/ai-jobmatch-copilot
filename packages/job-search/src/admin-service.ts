import { prisma, type Prisma } from '@jobmatch/database';
import type {
  AdminCompanyRowDto,
  AdminFeatureFlagDto,
  AdminJobRowDto,
  AdminOverviewDto,
  AdminSubscriptionRowDto,
  AdminUserRowDto,
  AppRole,
} from '@jobmatch/types';

import {
  DEFAULT_FEATURE_FLAGS,
  toAdminCompanyRow,
  toAdminFeatureFlag,
  toAdminJobRow,
  toAdminSubscriptionRow,
  toAdminUserRow,
} from './admin';

const LIST_LIMIT = 100;

async function ensureDefaultFlags(): Promise<void> {
  await Promise.all(
    DEFAULT_FEATURE_FLAGS.map((flag) =>
      prisma.appFeatureFlag.upsert({
        where: { key: flag.key },
        create: {
          key: flag.key,
          enabled: flag.enabled,
          description: flag.description,
        },
        // Do not overwrite existing description. We store rollout metadata as a
        // tagged suffix in `description` for forward-compatibility without migrations.
        update: {},
      }),
    ),
  );
}

export async function logAdminAction(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      detail: input.detail
        ? (input.detail as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

export async function listAdminFeatureFlags(): Promise<AdminFeatureFlagDto[]> {
  await ensureDefaultFlags();
  const rows = await prisma.appFeatureFlag.findMany({ orderBy: { key: 'asc' } });
  return rows.map(toAdminFeatureFlag);
}

export async function setAdminFeatureFlag(input: {
  key: string;
  enabled: boolean;
  rolloutPercent?: number | null;
  actorUserId: string;
}): Promise<AdminFeatureFlagDto> {
  await ensureDefaultFlags();
  const existing = await prisma.appFeatureFlag.findUnique({
    where: { key: input.key },
    select: { key: true, enabled: true, description: true },
  });
  if (!existing) {
    throw new Error('Feature flag not found');
  }

  const currentRollout = parseRolloutPercent(existing.description);
  const desiredRollout =
    input.rolloutPercent === undefined
      ? currentRollout
      : input.rolloutPercent === null
        ? null
        : Math.max(0, Math.min(100, Math.trunc(input.rolloutPercent)));

  const nextDescription = upsertRolloutTag(existing.description, desiredRollout);

  const row = await prisma.appFeatureFlag.update({
    where: { key: input.key },
    data: {
      enabled: input.enabled,
      description: nextDescription,
      updatedBy: input.actorUserId,
    },
  });

  await logAdminAction({
    actorUserId: input.actorUserId,
    action: 'flag.set',
    targetType: 'feature_flag',
    targetId: input.key,
    detail: { enabled: input.enabled },
  });

  return toAdminFeatureFlag(row);
}

function parseRolloutPercent(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/\[rollout_percent=(\d{1,3})\]/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.trunc(n)));
}

function upsertRolloutTag(description: string | null, rolloutPercent: number | null) {
  const base = (description ?? '').replace(/\s*\[rollout_percent=\d{1,3}\]\s*/gi, ' ').trim();
  if (rolloutPercent == null) {
    return base ? base : null;
  }
  const tag = `[rollout_percent=${rolloutPercent}]`;
  return base ? `${base} ${tag}` : tag;
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const flags = await listAdminFeatureFlags();

  const [
    usersTotal,
    admins,
    onboarded,
    companies,
    jobs,
    activeJobs,
    proActive,
    pastDue,
    freeSubs,
    usersWithoutSub,
    applications,
    resumes,
    coachSessions,
    portfolioProjects,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.userPreference.count({ where: { onboardingCompleted: true } }),
    prisma.company.count(),
    prisma.job.count(),
    prisma.job.count({ where: { isActive: true } }),
    prisma.subscription.count({
      where: {
        planId: 'pro',
        status: { in: ['active', 'on_trial'] },
      },
    }),
    prisma.subscription.count({ where: { status: 'past_due' } }),
    prisma.subscription.count({
      where: {
        OR: [{ planId: 'free' }, { status: { in: ['inactive', 'canceled', 'expired'] } }],
      },
    }),
    prisma.user.count({ where: { subscription: null } }),
    prisma.application.count(),
    prisma.resume.count(),
    prisma.careerCoachSession.count(),
    prisma.portfolioProject.count(),
  ]);

  return {
    users: { total: usersTotal, admins, onboarded },
    catalog: { companies, jobs, activeJobs },
    billing: {
      proActive,
      free: freeSubs + usersWithoutSub,
      pastDue,
    },
    engagement: {
      applications,
      resumes,
      coachSessions,
      portfolioProjects,
    },
    flags,
  };
}

export async function listAdminUsers(): Promise<AdminUserRowDto[]> {
  const rows = await prisma.user.findMany({
    take: LIST_LIMIT,
    orderBy: { createdAt: 'desc' },
    include: {
      preferences: { select: { onboardingCompleted: true } },
      subscription: { select: { planId: true, status: true } },
    },
  });
  return rows.map(toAdminUserRow);
}

export async function updateAdminUserRole(input: {
  userId: string;
  role: AppRole;
  actorUserId: string;
}): Promise<AdminUserRowDto> {
  if (input.userId === input.actorUserId && input.role !== 'admin') {
    throw new Error('Cannot demote yourself');
  }

  const existing = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!existing) {
    throw new Error('User not found');
  }

  const row = await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
    include: {
      preferences: { select: { onboardingCompleted: true } },
      subscription: { select: { planId: true, status: true } },
    },
  });

  await logAdminAction({
    actorUserId: input.actorUserId,
    action: 'user.role_update',
    targetType: 'user',
    targetId: input.userId,
    detail: { from: existing.role, to: input.role },
  });

  return toAdminUserRow(row);
}

export async function listAdminJobs(): Promise<AdminJobRowDto[]> {
  const rows = await prisma.job.findMany({
    take: LIST_LIMIT,
    orderBy: [{ isActive: 'desc' }, { postedAt: 'desc' }],
    include: { company: { select: { name: true, slug: true } } },
  });
  return rows.map(toAdminJobRow);
}

export async function listAdminCompanies(): Promise<AdminCompanyRowDto[]> {
  const rows = await prisma.company.findMany({
    take: LIST_LIMIT,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { jobs: true } },
      jobs: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });
  return rows.map(toAdminCompanyRow);
}

export async function listAdminSubscriptions(): Promise<AdminSubscriptionRowDto[]> {
  const rows = await prisma.subscription.findMany({
    take: LIST_LIMIT,
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map(toAdminSubscriptionRow);
}
