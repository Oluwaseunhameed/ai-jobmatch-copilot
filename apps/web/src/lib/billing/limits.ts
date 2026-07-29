import { prisma } from '@jobmatch/database';
import {
  FREE_PLAN_LIMITS,
  PRO_PLAN_LIMITS,
  TEAM_PLAN_LIMITS,
  type PlanId,
  type PlanLimits,
} from '@jobmatch/types';

import { resolvePlanFromSubscription } from './subscription';

export type PlanAction = 'resume' | 'saved_job' | 'optimize' | 'cover_letter';

export class PlanLimitError extends Error {
  readonly code = 'PLAN_LIMIT' as const;
  readonly status = 403;
  readonly action: PlanAction;
  readonly limit: number;
  readonly used: number;
  readonly planId: PlanId;

  constructor(input: {
    action: PlanAction;
    limit: number;
    used: number;
    planId: PlanId;
    message: string;
  }) {
    super(input.message);
    this.name = 'PlanLimitError';
    this.action = input.action;
    this.limit = input.limit;
    this.used = input.used;
    this.planId = input.planId;
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      action: this.action,
      limit: this.limit,
      used: this.used,
      planId: this.planId,
      upgradeUrl: '/settings/plan',
    };
  }
}

export async function resolveUserPlanId(userId: string): Promise<PlanId> {
  const row = await prisma.subscription.findUnique({ where: { userId } });
  return resolvePlanFromSubscription(row);
}

export function limitsForPlan(planId: PlanId): PlanLimits {
  if (planId === 'team') return TEAM_PLAN_LIMITS;
  if (planId === 'pro') return PRO_PLAN_LIMITS;
  return FREE_PLAN_LIMITS;
}

function monthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function assertWithinPlanLimit(userId: string, action: PlanAction) {
  const planId = await resolveUserPlanId(userId);
  const limits = limitsForPlan(planId);

  if (action === 'resume') {
    const used = await prisma.resume.count({ where: { userId } });
    if (used >= limits.maxResumes) {
      throw new PlanLimitError({
        action,
        limit: limits.maxResumes,
        used,
        planId,
        message:
          planId === 'pro'
            ? `Pro plan allows ${limits.maxResumes} resumes.`
            : `Free plan allows ${limits.maxResumes} resumes. Upgrade to Pro for more.`,
      });
    }
    return { planId, limits, used };
  }

  if (action === 'saved_job') {
    const used = await prisma.jobInteraction.count({
      where: { userId, type: 'saved' },
    });
    if (used >= limits.maxSavedJobs) {
      throw new PlanLimitError({
        action,
        limit: limits.maxSavedJobs,
        used,
        planId,
        message:
          planId === 'pro'
            ? `Pro plan allows ${limits.maxSavedJobs} saved jobs.`
            : `Free plan allows ${limits.maxSavedJobs} saved jobs. Upgrade to Pro for more.`,
      });
    }
    return { planId, limits, used };
  }

  const { start, end } = monthWindow();

  if (action === 'optimize') {
    const used = await prisma.resumeOptimization.count({
      where: {
        userId,
        createdAt: { gte: start, lt: end },
        status: { not: 'failed' },
      },
    });
    if (used >= limits.aiOptimizePerMonth) {
      throw new PlanLimitError({
        action,
        limit: limits.aiOptimizePerMonth,
        used,
        planId,
        message: `Monthly resume optimisation limit reached (${limits.aiOptimizePerMonth}). Upgrade to Pro for more.`,
      });
    }
    return { planId, limits, used };
  }

  // cover_letter
  const used = await prisma.applicationDraft.count({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
      status: { not: 'failed' },
    },
  });
  if (used >= limits.aiCoverLettersPerMonth) {
    throw new PlanLimitError({
      action,
      limit: limits.aiCoverLettersPerMonth,
      used,
      planId,
      message: `Monthly cover-letter limit reached (${limits.aiCoverLettersPerMonth}). Upgrade to Pro for more.`,
    });
  }
  return { planId, limits, used };
}
