import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { ensureUserFromClerk, prisma, type User, type UserPreference } from '@jobmatch/database';
import { parseAdminEmails, redeemReferralCode, userHasAdminAccess } from '@jobmatch/job-search';
import { cacheKeys } from '@/lib/cache/jobmatch-hubs-cache';
import { withRedisJsonCache } from '@/lib/cache/redis-ttl-cache';

export type AppAuthContext = {
  userId: string;
  user: User & { preferences: UserPreference | null };
};

export type AdminGateResult =
  | { status: 'ok'; app: AppAuthContext }
  | { status: 'unauthorized' }
  | { status: 'forbidden' };

type SerializedUserPreference = {
  theme: UserPreference['theme'];
  locale: UserPreference['locale'];
  timezone: UserPreference['timezone'];
  emailJobAlerts: UserPreference['emailJobAlerts'];
  emailApplicationUpdates: UserPreference['emailApplicationUpdates'];
  emailWeeklyDigest: UserPreference['emailWeeklyDigest'];
  emailMarketing: UserPreference['emailMarketing'];
  pushEnabled: UserPreference['pushEnabled'];
  onboardingCompleted: UserPreference['onboardingCompleted'];
  lastWeeklyDigestAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SerializedAppUser = {
  id: User['id'];
  name: User['name'];
  email: User['email'];
  emailVerified: User['emailVerified'];
  image: User['image'];
  role: User['role'];
  createdAt: string;
  updatedAt: string;
  preferences: SerializedUserPreference | null;
};

function serializeAppUser(existing: User & { preferences: UserPreference | null }): SerializedAppUser {
  return {
    id: existing.id,
    name: existing.name,
    email: existing.email,
    emailVerified: existing.emailVerified,
    image: existing.image ?? null,
    role: existing.role,
    createdAt: existing.createdAt.toISOString(),
    updatedAt: existing.updatedAt.toISOString(),
    preferences: existing.preferences
      ? {
          theme: existing.preferences.theme,
          locale: existing.preferences.locale,
          timezone: existing.preferences.timezone,
          emailJobAlerts: existing.preferences.emailJobAlerts,
          emailApplicationUpdates: existing.preferences.emailApplicationUpdates,
          emailWeeklyDigest: existing.preferences.emailWeeklyDigest,
          emailMarketing: existing.preferences.emailMarketing,
          pushEnabled: existing.preferences.pushEnabled,
          onboardingCompleted: existing.preferences.onboardingCompleted,
          lastWeeklyDigestAt: existing.preferences.lastWeeklyDigestAt
            ? existing.preferences.lastWeeklyDigestAt.toISOString()
            : null,
          createdAt: existing.preferences.createdAt.toISOString(),
          updatedAt: existing.preferences.updatedAt.toISOString(),
        }
      : null,
  };
}

function deserializeAppUser(serialized: SerializedAppUser): User & { preferences: UserPreference | null } {
  return {
    id: serialized.id,
    name: serialized.name,
    email: serialized.email,
    emailVerified: serialized.emailVerified,
    image: serialized.image ?? null,
    role: serialized.role,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
    // Only the app uses these fields (theme/locale/onboarding/settings gates).
    preferences: serialized.preferences
      ? ({
          theme: serialized.preferences.theme,
          locale: serialized.preferences.locale,
          timezone: serialized.preferences.timezone,
          emailJobAlerts: serialized.preferences.emailJobAlerts,
          emailApplicationUpdates: serialized.preferences.emailApplicationUpdates,
          emailWeeklyDigest: serialized.preferences.emailWeeklyDigest,
          emailMarketing: serialized.preferences.emailMarketing,
          pushEnabled: serialized.preferences.pushEnabled,
          onboardingCompleted: serialized.preferences.onboardingCompleted,
          lastWeeklyDigestAt: serialized.preferences.lastWeeklyDigestAt
            ? new Date(serialized.preferences.lastWeeklyDigestAt)
            : null,
          createdAt: new Date(serialized.preferences.createdAt),
          updatedAt: new Date(serialized.preferences.updatedAt),
        } as UserPreference)
      : null,
  };
}

/**
 * Attribute `jm_ref` cookie even when Clerk webhook created the user first
 * (ensure path would otherwise skip redeem forever). Clears cookie after attempt.
 *
 * Reading cookies() is synchronous once the store is awaited, so we check for
 * the cookie BEFORE doing any async work — the vast majority of requests have
 * no referral cookie and return instantly.
 */
async function maybeRedeemReferralCookie(userId: string) {
  const jar = await cookies();
  const refCode = jar.get('jm_ref')?.value?.trim();
  // Fast path: no cookie → nothing to do, no DB round-trip.
  if (!refCode) return;
  try {
    await redeemReferralCode({ referredUserId: userId, code: refCode });
  } catch {
    // best-effort
  }
  try {
    jar.delete('jm_ref');
  } catch {
    // cookie may be read-only in some contexts
  }
}

/**
 * Require a Clerk session and a mirrored Postgres User.
 *
 * Prefer the local DB row keyed by session userId. `currentUser()` hits Clerk's
 * Backend API (rate-limited ~100/10s) and must not run on every poll/request.
 * Only call it when the local user is missing (first request / webhook lag).
 */
const AUTH_LOOKUP_MS = 8_000;
const CLERK_ENSURE_MS = 8_000;

function withBudget<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function requireAppUser(): Promise<AppAuthContext | null> {
  const session = await auth();
  if (!session.userId) {
    return null;
  }

  const userId = session.userId;
  let cached: SerializedAppUser | null = null;
  try {
    cached = await withBudget(
      withRedisJsonCache<SerializedAppUser | null>({
        key: cacheKeys.authUser(userId),
        ttlSeconds: 60,
        computeTimeoutMs: AUTH_LOOKUP_MS,
        shouldCache: (value) => value !== null,
        compute: async () => {
          const existing = await prisma.user.findUnique({
            where: { id: userId },
            include: { preferences: true },
          });
          if (!existing) return null;

          // Ensure preferences row exists so downstream layout doesn't hit the DB again.
          if (!existing.preferences) {
            await prisma.userPreference.create({ data: { userId: existing.id } });
            const refreshed = await prisma.user.findUnique({
              where: { id: existing.id },
              include: { preferences: true },
            });
            return refreshed ? serializeAppUser(refreshed) : null;
          }

          return serializeAppUser(existing);
        },
      }),
      AUTH_LOOKUP_MS + 1_500,
      'requireAppUser.local',
    );
  } catch (error) {
    console.error('[auth] local user lookup failed', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    cached = null;
  }

  if (cached) {
    // Fire-and-forget — cookie redeem is best-effort.
    void maybeRedeemReferralCookie(userId);
    return { userId, user: deserializeAppUser(cached) };
  }

  try {
    const clerkUser = await withBudget(currentUser(), CLERK_ENSURE_MS, 'requireAppUser.clerk');
    if (!clerkUser) {
      return null;
    }

    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
      clerkUser.emailAddresses[0];

    if (!primaryEmail?.emailAddress) {
      return null;
    }

    const user = await withBudget(
      ensureUserFromClerk({
        id: clerkUser.id,
        email: primaryEmail.emailAddress,
        emailVerified: primaryEmail.verification?.status === 'verified',
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
          clerkUser.username,
        image: clerkUser.imageUrl,
      }),
      CLERK_ENSURE_MS,
      'requireAppUser.ensure',
    );

    void maybeRedeemReferralCookie(user.id);

    return {
      userId: session.userId,
      user,
    };
  } catch (error) {
    console.error('[auth] Clerk currentUser failed while ensuring local user', {
      userId: session.userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Require an authenticated user with admin access (`User.role === 'admin'`
 * or email in `ADMIN_EMAILS`). Allowlisted emails are promoted to `admin` once.
 */
export async function requireAdmin(): Promise<AdminGateResult> {
  const app = await requireAppUser();
  if (!app) {
    return { status: 'unauthorized' };
  }

  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  const allowed = userHasAdminAccess({
    role: app.user.role,
    email: app.user.email,
    adminEmails,
  });

  if (!allowed) {
    return { status: 'forbidden' };
  }

  if (app.user.role !== 'admin') {
    const updated = await prisma.user.update({
      where: { id: app.user.id },
      data: { role: 'admin' },
      include: { preferences: true },
    });
    return { status: 'ok', app: { userId: app.userId, user: updated } };
  }

  return { status: 'ok', app };
}

export async function requireSupport(): Promise<AdminGateResult> {
  const app = await requireAppUser();
  if (!app) return { status: 'unauthorized' };
  if (app.user.role !== 'admin' && app.user.role !== 'support') {
    return { status: 'forbidden' };
  }
  return { status: 'ok', app };
}

export async function requireCoach(): Promise<AdminGateResult> {
  const app = await requireAppUser();
  if (!app) return { status: 'unauthorized' };
  if (app.user.role !== 'admin' && app.user.role !== 'coach') {
    return { status: 'forbidden' };
  }
  return { status: 'ok', app };
}

export async function requireStaff(): Promise<AdminGateResult> {
  const app = await requireAppUser();
  if (!app) return { status: 'unauthorized' };
  if (!['admin', 'support', 'coach'].includes(app.user.role)) {
    return { status: 'forbidden' };
  }
  return { status: 'ok', app };
}

export function isAdminAppUser(user: Pick<User, 'role' | 'email'>): boolean {
  return userHasAdminAccess({
    role: user.role,
    email: user.email,
    adminEmails: parseAdminEmails(process.env.ADMIN_EMAILS),
  });
}
