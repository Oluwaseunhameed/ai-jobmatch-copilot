import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserFromClerk, prisma, type User, type UserPreference } from '@jobmatch/database';
import { parseAdminEmails, userHasAdminAccess } from '@jobmatch/job-search';

export type AppAuthContext = {
  userId: string;
  user: User & { preferences: UserPreference | null };
};

export type AdminGateResult =
  | { status: 'ok'; app: AppAuthContext }
  | { status: 'unauthorized' }
  | { status: 'forbidden' };

/**
 * Require a Clerk session and a mirrored Postgres User.
 *
 * Prefer the local DB row keyed by session userId. `currentUser()` hits Clerk's
 * Backend API (rate-limited ~100/10s) and must not run on every poll/request.
 * Only call it when the local user is missing (first request / webhook lag).
 */
export async function requireAppUser(): Promise<AppAuthContext | null> {
  const session = await auth();
  if (!session.userId) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { preferences: true },
  });
  if (existing) {
    return { userId: session.userId, user: existing };
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
      clerkUser.emailAddresses[0];

    if (!primaryEmail?.emailAddress) {
      return null;
    }

    const user = await ensureUserFromClerk({
      id: clerkUser.id,
      email: primaryEmail.emailAddress,
      emailVerified: primaryEmail.verification?.status === 'verified',
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username,
      image: clerkUser.imageUrl,
    });

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

export function isAdminAppUser(user: Pick<User, 'role' | 'email'>): boolean {
  return userHasAdminAccess({
    role: user.role,
    email: user.email,
    adminEmails: parseAdminEmails(process.env.ADMIN_EMAILS),
  });
}
