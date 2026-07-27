import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserFromClerk, prisma, type User, type UserPreference } from '@jobmatch/database';

export type AppAuthContext = {
  userId: string;
  user: User & { preferences: UserPreference | null };
};

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
