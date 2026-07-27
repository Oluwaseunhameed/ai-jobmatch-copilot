import { NextResponse } from 'next/server';

import { verifyLemonSignature } from '@/lib/billing/lemon';
import { upsertSubscription } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string; purchase_type?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      customer_id?: number | string;
      variant_id?: number | string;
      renews_at?: string | null;
      ends_at?: string | null;
      cancelled?: boolean;
      user_email?: string;
      first_order_item?: { variant_id?: number | string };
    };
  };
};

function mapLemonStatus(raw?: string): string {
  switch ((raw || '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'on_trial':
      return 'on_trial';
    case 'past_due':
      return 'past_due';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'expired':
      return 'expired';
    default:
      return raw || 'inactive';
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  if (!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
    console.error('[billing] LEMON_SQUEEZY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: { message: 'Webhook not configured' } }, { status: 503 });
  }

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LemonPayload;
  const event = payload.meta?.event_name || '';
  const userId = payload.meta?.custom_data?.user_id;
  const attrs = payload.data?.attributes;

  if (!userId) {
    // One-time orders / events without custom data — acknowledge but skip.
    console.warn('[billing] Lemon webhook missing user_id custom data', { event });
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (
    event.startsWith('subscription_') ||
    event === 'subscription_payment_success' ||
    event === 'subscription_payment_recovered'
  ) {
    const status = mapLemonStatus(attrs?.status);
    const periodEnd = attrs?.renews_at || attrs?.ends_at || null;

    await upsertSubscription({
      userId,
      status,
      provider: 'lemon_squeezy',
      providerCustomerId: attrs?.customer_id != null ? String(attrs.customer_id) : null,
      providerSubscriptionId: payload.data?.id ? String(payload.data.id) : null,
      providerVariantId: attrs?.variant_id != null ? String(attrs.variant_id) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
      cancelAtPeriodEnd: Boolean(attrs?.cancelled),
      rawMeta: payload as unknown as object,
    });
  }

  // One-time purchases only — skip order_* for subscription checkouts
  // (those also emit order_created alongside subscription_created).
  if (event === 'order_created' || event === 'order_refunded') {
    const variantId =
      attrs?.first_order_item?.variant_id ?? attrs?.variant_id ?? null;
    const oneTimeVariant = process.env.LEMON_SQUEEZY_PRO_ONETIME_VARIANT_ID;
    const isOneTime =
      payload.meta?.custom_data?.purchase_type === 'one_time' ||
      (oneTimeVariant != null &&
        variantId != null &&
        String(variantId) === String(oneTimeVariant));

    if (isOneTime) {
      const periodEnd = new Date();
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
      await upsertSubscription({
        userId,
        status: event === 'order_refunded' ? 'canceled' : 'active',
        provider: 'lemon_squeezy',
        providerCustomerId: attrs?.customer_id != null ? String(attrs.customer_id) : null,
        providerSubscriptionId: payload.data?.id ? `order_${payload.data.id}` : null,
        providerVariantId: variantId != null ? String(variantId) : null,
        currentPeriodEnd: event === 'order_refunded' ? new Date() : periodEnd,
        cancelAtPeriodEnd: event === 'order_refunded',
        rawMeta: payload as unknown as object,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
