import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import type { BillingProvider, PlanId } from '@jobmatch/types';

import { requireAppUser } from '@/lib/auth';
import {
  createLemonCheckout,
  lemonConfigured,
  lemonTeamConfigured,
} from '@/lib/billing/lemon';
import {
  createPaystackCheckout,
  paystackConfigured,
  paystackTeamConfigured,
} from '@/lib/billing/paystack';
import { resolveBillingProvider } from '@/lib/billing/region';
import { resolveUserPlanId } from '@/lib/billing/limits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const [subscription, profile, planId] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: app.user.id } }),
    prisma.careerProfile.findUnique({
      where: { userId: app.user.id },
      select: { country: true },
    }),
    resolveUserPlanId(app.user.id),
  ]);

  const suggestedProvider = resolveBillingProvider({ country: profile?.country });

  return NextResponse.json(
    {
      planId,
      subscription: subscription
        ? {
            status: subscription.status,
            provider: subscription.provider,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      country: profile?.country ?? null,
      suggestedProvider,
      providers: {
        lemon_squeezy: lemonConfigured(),
        paystack: paystackConfigured(),
        lemon_team: lemonTeamConfigured(),
        paystack_team: paystackTeamConfigured(),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: BillingProvider;
    purchaseType?: 'subscription' | 'one_time';
    planId?: PlanId;
  } | null;

  const checkoutPlan: 'pro' | 'team' = body?.planId === 'team' ? 'team' : 'pro';

  const profile = await prisma.careerProfile.findUnique({
    where: { userId: app.user.id },
    select: { country: true },
  });

  const provider = resolveBillingProvider({
    country: profile?.country,
    preferProvider: body?.provider ?? null,
  });
  const purchaseType = body?.purchaseType === 'one_time' ? 'one_time' : 'subscription';

  try {
    if (provider === 'paystack') {
      if (checkoutPlan === 'team') {
        if (!paystackTeamConfigured()) {
          return NextResponse.json(
            {
              error: {
                message:
                  'Paystack Team is not configured yet. Add PAYSTACK_TEAM_PLAN_CODE or PAYSTACK_TEAM_AMOUNT_KOBO.',
              },
            },
            { status: 503 },
          );
        }
      } else if (!paystackConfigured()) {
        return NextResponse.json(
          {
            error: {
              message:
                'Paystack is not configured yet. Add PAYSTACK_SECRET_KEY and a plan/amount in env.',
            },
          },
          { status: 503 },
        );
      }
      const checkout = await createPaystackCheckout({
        userId: app.user.id,
        email: app.user.email,
        mode: purchaseType,
        planId: checkoutPlan,
      });
      return NextResponse.json({ provider, url: checkout.url, reference: checkout.reference });
    }

    if (checkoutPlan === 'team') {
      if (!lemonTeamConfigured()) {
        return NextResponse.json(
          {
            error: {
              message:
                'Lemon Squeezy Team is not configured yet. Add LEMON_SQUEEZY_TEAM_VARIANT_ID.',
            },
          },
          { status: 503 },
        );
      }
    } else if (!lemonConfigured()) {
      return NextResponse.json(
        {
          error: {
            message:
              'Lemon Squeezy is not configured yet. Add LEMON_SQUEEZY_API_KEY, STORE_ID, and PRO_VARIANT_ID.',
          },
        },
        { status: 503 },
      );
    }

    const checkout = await createLemonCheckout({
      userId: app.user.id,
      email: app.user.email,
      name: app.user.name,
      purchaseType,
      planId: checkoutPlan,
    });
    return NextResponse.json({ provider, url: checkout.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Checkout failed',
        },
      },
      { status: 502 },
    );
  }
}
