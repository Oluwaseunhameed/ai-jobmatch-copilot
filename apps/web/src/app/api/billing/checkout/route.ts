import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import type { BillingProvider } from '@jobmatch/types';

import { requireAppUser } from '@/lib/auth';
import { createLemonCheckout, lemonConfigured } from '@/lib/billing/lemon';
import { createPaystackCheckout, paystackConfigured } from '@/lib/billing/paystack';
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
  } | null;

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
      if (!paystackConfigured()) {
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
      });
      return NextResponse.json({ provider, url: checkout.url, reference: checkout.reference });
    }

    if (!lemonConfigured()) {
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
