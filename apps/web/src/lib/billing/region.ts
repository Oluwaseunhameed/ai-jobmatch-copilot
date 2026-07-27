import type { BillingProvider } from '@jobmatch/types';

const NIGERIA_ALIASES = new Set([
  'ng',
  'nga',
  'nigeria',
  'federal republic of nigeria',
]);

export function isNigeriaCountry(country: string | null | undefined) {
  if (!country) return false;
  return NIGERIA_ALIASES.has(country.trim().toLowerCase());
}

export function resolveBillingProvider(input: {
  country?: string | null;
  preferProvider?: BillingProvider | null;
}): BillingProvider {
  if (input.preferProvider === 'paystack' || input.preferProvider === 'lemon_squeezy') {
    return input.preferProvider;
  }
  return isNigeriaCountry(input.country) ? 'paystack' : 'lemon_squeezy';
}

export function providerLabel(provider: BillingProvider) {
  return provider === 'paystack' ? 'Paystack (NGN)' : 'Lemon Squeezy';
}
