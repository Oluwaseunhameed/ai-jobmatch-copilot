import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';

import { verifyPaystackSignature } from '@/lib/billing/paystack';
import { upsertSubscription } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    customer?: { email?: string; customer_code?: string };
    plan?: { plan_code?: string };
    authorization?: { authorization_code?: string };
    paid_at?: string;
    metadata?: { user_id?: string; plan_id?: string };
    subscription_code?: string;
    next_payment_date?: string;
  };
};

async function resolveUserId(data: PaystackEvent['data']): Promise<string | null> {
  if (data?.metadata?.user_id) return data.metadata.user_id;
  const email = data?.customer?.email?.toLowerCase();
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('[billing] PAYSTACK_SECRET_KEY is not set');
    return NextResponse.json({ error: { message: 'Webhook not configured' } }, { status: 503 });
  }

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as PaystackEvent;
  const event = payload.event || '';
  const data = payload.data;
  const userId = await resolveUserId(data);

  if (!userId) {
    console.warn('[billing] Paystack webhook could not resolve user', { event });
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (event === 'charge.success' || event === 'subscription.create') {
    let periodEnd = data?.next_payment_date ? new Date(data.next_payment_date) : null;
    // One-time charge without a plan — grant Pro for 30 days.
    if (!periodEnd && !data?.subscription_code && !data?.plan?.plan_code) {
      periodEnd = new Date();
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
    }
    await upsertSubscription({
      userId,
      status: 'active',
      provider: 'paystack',
      planId: data?.metadata?.plan_id === 'team' ? 'team' : undefined,
      providerCustomerId: data?.customer?.customer_code ?? null,
      providerSubscriptionId:
        data?.subscription_code || data?.reference || data?.authorization?.authorization_code || null,
      providerVariantId: data?.plan?.plan_code ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      rawMeta: payload as unknown as object,
    });
  }

  if (event === 'subscription.disable' || event === 'subscription.not_renew') {
    await upsertSubscription({
      userId,
      status: 'canceled',
      provider: 'paystack',
      planId: data?.metadata?.plan_id === 'team' ? 'team' : undefined,
      providerCustomerId: data?.customer?.customer_code ?? null,
      providerSubscriptionId: data?.subscription_code ?? null,
      providerVariantId: data?.plan?.plan_code ?? null,
      currentPeriodEnd: data?.next_payment_date ? new Date(data.next_payment_date) : null,
      cancelAtPeriodEnd: true,
      rawMeta: payload as unknown as object,
    });
  }

  return NextResponse.json({ ok: true });
}
