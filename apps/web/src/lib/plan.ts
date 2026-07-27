import { prisma } from '@jobmatch/database';
import {
  FREE_PLAN_ID,
  type PlanId,
} from '@jobmatch/types';

import { resolvePlanFromSubscription } from '@/lib/billing/subscription';

export {
  FREE_PLAN_ID,
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  PRO_PLAN_ID,
  PRO_PLAN_LIMITS,
  freePlanFeatures,
  proPlanFeatures,
  proPlanTeasers,
  type PlanFeature,
  type PlanId,
  type PlanLimits,
  getPlanLimits,
} from '@/lib/plan-features';

export async function getCurrentPlanId(userId?: string): Promise<PlanId> {
  if (!userId) return FREE_PLAN_ID;
  const row = await prisma.subscription.findUnique({ where: { userId } });
  return resolvePlanFromSubscription(row);
}
