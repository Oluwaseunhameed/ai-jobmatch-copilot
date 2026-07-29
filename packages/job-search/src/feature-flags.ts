import { createHash } from 'node:crypto';

import { prisma } from '@jobmatch/database';

/**
 * Resolve a lightweight feature flag for a specific user.
 *
 * - If `rolloutPercent` is null: the flag behaves like a boolean toggle.
 * - If `rolloutPercent` is set: flag is enabled only for `rolloutPercent%` of users
 *   using deterministic hash bucketing (`userId + ':' + key`).
 *
 * We keep "guest" users (no userId) conservative: if rollout is configured, they
 * get the control variant (feature disabled).
 */
export async function isAppFeatureFlagEnabledForUser(input: {
  key: string;
  userId?: string | null;
}): Promise<boolean> {
  const row = await prisma.appFeatureFlag.findUnique({
    where: { key: input.key },
    select: { enabled: true, description: true },
  });

  if (!row?.enabled) return false;
  const rolloutPercent = parseRolloutPercent(row.description);
  if (rolloutPercent == null) return true;

  const userId = input.userId?.trim();
  if (!userId) return false;

  const digest = createHash('sha256')
    .update(`${userId}:${input.key}`)
    .digest('hex');

  // Convert the first 8 hex chars into a number, then mod 100 to get 0..99.
  const num = parseInt(digest.slice(0, 8), 16);
  const bucket = num % 100;

  return bucket < rolloutPercent;
}

function parseRolloutPercent(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/\[rollout_percent=(\d{1,3})\]/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.trunc(n)));
}

