/** Curated public ATS board tokens (no API key). Override via env CSV lists. */
export const DEFAULT_GREENHOUSE_BOARDS = [
  'shopify',
  'github',
  'stripe',
  'discord',
  'airbnb',
  'figma',
  'gitlab',
  'cloudflare',
  'notion',
  'datadog',
];

export const DEFAULT_LEVER_BOARDS = [
  'spotify',
  'netflix',
  'twitch',
  'palantir',
  'fingerpaint',
];

export const DEFAULT_ASHBY_BOARDS = [
  'openai',
  'anthropic',
  'ramp',
  'linear',
  'vercel',
];

export const DEFAULT_WORKABLE_BOARDS = [
  'automattic',
];

export function csvEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve board list from env, falling back to curated defaults unless
 * INGEST_ATS_DEFAULTS=false.
 */
export function resolveBoards(envName: string, defaults: string[]): string[] {
  const fromEnv = csvEnv(envName);
  if (fromEnv.length) return fromEnv;
  if (process.env.INGEST_ATS_DEFAULTS === 'false') return [];
  return defaults;
}

export function adzunaReady() {
  return Boolean(process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim());
}

export function usajobsReady() {
  return Boolean(process.env.USAJOBS_API_KEY?.trim() && process.env.USAJOBS_USER_AGENT?.trim());
}

export function greenhouseReady() {
  return resolveBoards('GREENHOUSE_BOARDS', DEFAULT_GREENHOUSE_BOARDS).length > 0;
}

export function leverReady() {
  return resolveBoards('LEVER_BOARDS', DEFAULT_LEVER_BOARDS).length > 0;
}

export function ashbyReady() {
  return resolveBoards('ASHBY_BOARDS', DEFAULT_ASHBY_BOARDS).length > 0;
}

export function workableReady() {
  return resolveBoards('WORKABLE_BOARDS', DEFAULT_WORKABLE_BOARDS).length > 0;
}

export function keyedProviderReady(id: string): boolean {
  switch (id) {
    case 'adzuna':
      return adzunaReady();
    case 'usajobs':
      return usajobsReady();
    case 'greenhouse':
      return greenhouseReady();
    case 'lever':
      return leverReady();
    case 'ashby':
      return ashbyReady();
    case 'workable':
      return workableReady();
    default:
      return false;
  }
}

export function keyedProviderMissing(id: string): string | null {
  switch (id) {
    case 'adzuna':
      return adzunaReady()
        ? null
        : 'Set ADZUNA_APP_ID + ADZUNA_APP_KEY (https://developer.adzuna.com/)';
    case 'usajobs':
      return usajobsReady()
        ? null
        : 'Set USAJOBS_API_KEY + USAJOBS_USER_AGENT (https://developer.usajobs.gov/)';
    case 'greenhouse':
      return greenhouseReady() ? null : 'Set GREENHOUSE_BOARDS or enable INGEST_ATS_DEFAULTS';
    case 'lever':
      return leverReady() ? null : 'Set LEVER_BOARDS or enable INGEST_ATS_DEFAULTS';
    case 'ashby':
      return ashbyReady() ? null : 'Set ASHBY_BOARDS or enable INGEST_ATS_DEFAULTS';
    case 'workable':
      return workableReady() ? null : 'Set WORKABLE_BOARDS or enable INGEST_ATS_DEFAULTS';
    default:
      return 'Not a keyed/ATS provider';
  }
}
