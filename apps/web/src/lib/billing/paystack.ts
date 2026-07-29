import { appUrl } from './subscription';
import { hmacHex, safeEqualHex } from './crypto';

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function paystackTeamConfigured() {
  return Boolean(
    process.env.PAYSTACK_SECRET_KEY &&
      (process.env.PAYSTACK_TEAM_PLAN_CODE || process.env.PAYSTACK_TEAM_AMOUNT_KOBO),
  );
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, rawBody, 'sha512'), signature);
}

function parseKobo(raw: string | number | undefined): number {
  if (raw == null || raw === '') return 0;
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

async function resolvePaystackAmountKobo(input: {
  secret: string;
  planCode?: string;
  fallbackKobo: number;
}): Promise<number> {
  if (input.planCode) {
    const response = await fetch(
      `https://api.paystack.co/plan/${encodeURIComponent(input.planCode)}`,
      {
        headers: { Authorization: `Bearer ${input.secret}` },
      },
    );
    if (response.ok) {
      const json = (await response.json()) as {
        status?: boolean;
        data?: { amount?: number };
      };
      const planAmount = parseKobo(json.data?.amount);
      if (planAmount > 0) return planAmount;
    }
  }

  const fallback = parseKobo(input.fallbackKobo);
  if (fallback <= 0) {
    throw new Error(
      input.planCode
        ? `Could not read amount for Paystack plan ${input.planCode}. Check the plan code (test vs live) or set PAYSTACK_PRO_AMOUNT_KOBO.`
        : 'Paystack amount is missing. Set PAYSTACK_PRO_AMOUNT_KOBO (integer kobo, e.g. 500000 for ₦5,000).',
    );
  }
  return fallback;
}

export async function createPaystackCheckout(input: {
  userId: string;
  email: string;
  amountKobo?: number;
  planCode?: string;
  planId?: 'pro' | 'team';
  mode?: 'subscription' | 'one_time';
}): Promise<{ url: string; reference: string }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY.');
  }

  const mode = input.mode ?? 'subscription';
  const planId = input.planId === 'team' ? 'team' : 'pro';
  const plan =
    mode === 'one_time'
      ? undefined
      : input.planCode ||
        (planId === 'team'
          ? process.env.PAYSTACK_TEAM_PLAN_CODE
          : process.env.PAYSTACK_PRO_PLAN_CODE);
  const fallbackKobo = parseKobo(
    input.amountKobo ??
      (planId === 'team'
        ? process.env.PAYSTACK_TEAM_AMOUNT_KOBO
        : process.env.PAYSTACK_PRO_AMOUNT_KOBO) ??
      0,
  );
  const amount = await resolvePaystackAmountKobo({
    secret,
    planCode: plan,
    fallbackKobo,
  });

  // Paystack expects integer kobo — include amount even when a subscription plan is set.
  const body: Record<string, unknown> = {
    email: input.email,
    amount,
    currency: 'NGN',
    callback_url: appUrl('/settings/plan?checkout=success'),
    metadata: {
      user_id: input.userId,
      purchase_type: mode,
      plan_id: planId,
      custom_fields: [
        { display_name: 'User ID', variable_name: 'user_id', value: input.userId },
      ],
    },
  };

  if (plan) {
    body.plan = plan;
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    let paystackMessage: string | undefined;
    try {
      const parsed = JSON.parse(detail) as { message?: string };
      paystackMessage = parsed.message;
    } catch {
      // ignore non-JSON bodies
    }
    if (paystackMessage?.toLowerCase().includes('ip address is not allowed')) {
      throw new Error(
        'Paystack blocked this checkout because your server IP is not whitelisted. In Paystack Dashboard → Settings → API Keys & Webhooks, add your public IP (or disable IP whitelisting for test mode).',
      );
    }
    if (paystackMessage?.toLowerCase().includes('invalid amount')) {
      throw new Error(
        'Paystack rejected the checkout amount. Use integer kobo in PAYSTACK_PRO_AMOUNT_KOBO (₦5,000 → 500000), and ensure your plan amount in Paystack is at least ₦100.',
      );
    }
    throw new Error(
      `Paystack checkout failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const json = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!json.status || !json.data?.authorization_url || !json.data.reference) {
    throw new Error(json.message || 'Paystack checkout response incomplete');
  }

  return { url: json.data.authorization_url, reference: json.data.reference };
}
