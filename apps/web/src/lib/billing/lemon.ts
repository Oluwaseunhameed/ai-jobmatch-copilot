import { appUrl } from './subscription';
import { hmacHex, safeEqualHex } from './crypto';

export function lemonConfigured() {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_PRO_VARIANT_ID,
  );
}

export function verifyLemonSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, rawBody, 'sha256'), signature);
}

export async function createLemonCheckout(input: {
  userId: string;
  email: string;
  name?: string;
  variantId?: string;
  /** subscription (default) or one_time — echoed in webhook custom_data */
  purchaseType?: 'subscription' | 'one_time';
}): Promise<{ url: string }> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const purchaseType = input.purchaseType ?? 'subscription';
  const variantId =
    input.variantId ||
    (purchaseType === 'one_time'
      ? process.env.LEMON_SQUEEZY_PRO_ONETIME_VARIANT_ID
      : process.env.LEMON_SQUEEZY_PRO_VARIANT_ID);
  if (!apiKey || !storeId || !variantId) {
    throw new Error(
      'Lemon Squeezy is not configured. Set LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, and the Pro variant id.',
    );
  }

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: input.email,
            name: input.name || undefined,
            custom: {
              user_id: input.userId,
              purchase_type: purchaseType,
            },
          },
          product_options: {
            redirect_url: appUrl('/settings/plan?checkout=success'),
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(storeId) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Lemon Squeezy checkout failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const json = (await response.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error('Lemon Squeezy checkout response missing URL');
  return { url };
}
