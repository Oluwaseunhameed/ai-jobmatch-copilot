import { prisma, type Prisma } from '@jobmatch/database';
import type { BillingProvider, PlanId } from '@jobmatch/types';

export type UpsertSubscriptionInput = {
  userId: string;
  status: string;
  provider: BillingProvider;
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

/** Pro while active/on_trial within period, or canceled-but-still-in-period. */
export function resolvePlanFromSubscription(row: {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
} | null): PlanId {
  if (!row) return 'free';
  if (isProStatus(row.status) && stillInPaidPeriod(row.currentPeriodEnd)) return 'pro';
  if (
    row.status === 'canceled' &&
    row.currentPeriodEnd &&
    row.currentPeriodEnd.getTime() > Date.now()
  ) {
    return 'pro';
  }
  return 'free';
}

export async function upsertSubscription(input: UpsertSubscriptionInput) {
  const planId: PlanId =
    (isProStatus(input.status) && stillInPaidPeriod(input.currentPeriodEnd ?? null)) ||
    (input.status === 'canceled' &&
      !!input.currentPeriodEnd &&
      input.currentPeriodEnd.getTime() > Date.now())
      ? 'pro'
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
