import { prisma, type Prisma } from '@jobmatch/database';
import type { BillingProvider, PlanId } from '@jobmatch/types';

export type UpsertSubscriptionInput = {
  userId: string;
  status: string;
  provider: BillingProvider;
  /** Explicit paid plan from checkout custom data / metadata. */
  planId?: PlanId | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerVariantId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  rawMeta?: Prisma.InputJsonValue;
};

export function isProStatus(status: string) {
  return status === 'active' || status === 'on_trial';
}

function stillInPaidPeriod(currentPeriodEnd: Date | null) {
  return !currentPeriodEnd || currentPeriodEnd.getTime() > Date.now();
}

function isPaidSubscription(status: string, currentPeriodEnd: Date | null) {
  return (
    (isProStatus(status) && stillInPaidPeriod(currentPeriodEnd)) ||
    (status === 'canceled' &&
      !!currentPeriodEnd &&
      currentPeriodEnd.getTime() > Date.now())
  );
}

/** Map Lemon/Paystack product ids (and optional metadata) to a paid PlanId. */
export function resolvePaidPlanId(input: {
  planId?: string | null;
  providerVariantId?: string | null;
}): PlanId {
  if (input.planId === 'team' || input.planId === 'pro') {
    return input.planId;
  }

  const variant = input.providerVariantId ? String(input.providerVariantId) : null;
  if (variant) {
    const teamIds = [
      process.env.LEMON_SQUEEZY_TEAM_VARIANT_ID,
      process.env.LEMON_SQUEEZY_TEAM_ONETIME_VARIANT_ID,
      process.env.PAYSTACK_TEAM_PLAN_CODE,
    ]
      .filter(Boolean)
      .map(String);
    if (teamIds.includes(variant)) return 'team';

    const proIds = [
      process.env.LEMON_SQUEEZY_PRO_VARIANT_ID,
      process.env.LEMON_SQUEEZY_PRO_ONETIME_VARIANT_ID,
      process.env.PAYSTACK_PRO_PLAN_CODE,
    ]
      .filter(Boolean)
      .map(String);
    if (proIds.includes(variant)) return 'pro';
  }

  return 'pro';
}

/** Paid plan while active/on_trial within period, or canceled-but-still-in-period. */
export function resolvePlanFromSubscription(row: {
  planId?: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
} | null): PlanId {
  if (!row) return 'free';
  if (!isPaidSubscription(row.status, row.currentPeriodEnd)) return 'free';
  if (row.planId === 'team') return 'team';
  return 'pro';
}

export async function upsertSubscription(input: UpsertSubscriptionInput) {
  const paid = isPaidSubscription(input.status, input.currentPeriodEnd ?? null);
  const planId: PlanId = paid
    ? resolvePaidPlanId({
        planId: input.planId,
        providerVariantId: input.providerVariantId,
      })
    : 'free';

  return prisma.subscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      planId,
      status: input.status,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId ?? null,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      providerVariantId: input.providerVariantId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      rawMeta: input.rawMeta,
    },
    update: {
      planId,
      status: input.status,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId ?? undefined,
      providerSubscriptionId: input.providerSubscriptionId ?? undefined,
      providerVariantId: input.providerVariantId ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? undefined,
      rawMeta: input.rawMeta,
    },
  });
}

export function appUrl(path = '') {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;
}
