import { randomBytes } from 'node:crypto';

import { prisma } from '@jobmatch/database';
import type { ReferralSummaryDto } from '@jobmatch/types';

import { createInAppNotification } from './notification-service';

function rewardDays() {
  const raw = Number(process.env.REFERRAL_REWARD_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 30;
}

function makeCode() {
  return randomBytes(4).toString('hex');
}

export async function getOrCreateReferralSummary(userId: string): Promise<ReferralSummaryDto> {
  let row = await prisma.referralCode.findUnique({
    where: { userId },
    include: { redemptions: true },
  });
  if (!row) {
    for (let i = 0; i < 5; i += 1) {
      try {
        row = await prisma.referralCode.create({
          data: { userId, code: makeCode() },
          include: { redemptions: true },
        });
        break;
      } catch {
        // unique collision — retry
      }
    }
  }
  if (!row) throw new Error('Could not create referral code');

  return {
    code: row.code,
    sharePath: `/register?ref=${row.code}`,
    redemptionCount: row.redemptions.length,
    rewardedCount: row.redemptions.filter((r) => r.status === 'rewarded').length,
    rewardDays: rewardDays(),
  };
}

/**
 * Attribute a new user to a referral code. Best-effort; ignores self-referrals.
 * Signup attribution: `/register?ref=` sets `jm_ref` cookie (middleware); first
 * `requireAppUser` ensure calls redeemReferralCode.
 */
export async function redeemReferralCode(input: {
  referredUserId: string;
  code: string;
}): Promise<boolean> {
  const code = input.code.trim().toLowerCase();
  if (!code) return false;

  const referral = await prisma.referralCode.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
  });
  if (!referral || referral.userId === input.referredUserId) return false;

  const existing = await prisma.referralRedemption.findUnique({
    where: { referredUserId: input.referredUserId },
  });
  if (existing) return false;

  await prisma.referralRedemption.create({
    data: {
      codeId: referral.id,
      referredUserId: input.referredUserId,
      status: 'pending',
    },
  });

  await createInAppNotification({
    userId: referral.userId,
    type: 'referral_signup',
    title: 'Referral signup',
    body: 'Someone joined with your referral link. Reward applies after they complete onboarding.',
    href: '/settings/plan',
  });

  return true;
}

/** Grant referrer a Pro period extension when referred user completes onboarding. */
export async function maybeRewardReferral(referredUserId: string): Promise<void> {
  const redemption = await prisma.referralRedemption.findUnique({
    where: { referredUserId },
    include: { code: true },
  });
  if (!redemption || redemption.status !== 'pending') return;

  const days = rewardDays();
  const referrerId = redemption.code.userId;
  const sub = await prisma.subscription.findUnique({ where: { userId: referrerId } });
  const now = new Date();
  const base =
    sub?.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const extended = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  if (sub) {
    await prisma.subscription.update({
      where: { userId: referrerId },
      data: {
        planId: sub.planId === 'free' ? 'pro' : sub.planId,
        status: 'active',
        currentPeriodEnd: extended,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: referrerId,
        planId: 'pro',
        status: 'active',
        provider: 'lemon_squeezy',
        currentPeriodEnd: extended,
      },
    });
  }

  await prisma.referralRedemption.update({
    where: { id: redemption.id },
    data: { status: 'rewarded', rewardGrantedAt: now },
  });

  await createInAppNotification({
    userId: referrerId,
    type: 'referral_rewarded',
    title: 'Referral reward unlocked',
    body: `You received ${days} days of Pro for a successful referral.`,
    href: '/settings/plan',
  });
}
