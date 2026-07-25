import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserFromClerk, type User, type UserPreference } from '@jobmatch/database';

export type AppAuthContext = {
  userId: string;
  user: User & { preferences: UserPreference | null };
};

/**
 * Require a Clerk session and ensure a mirrored Postgres User exists.
 */
export async function requireAppUser(): Promise<AppAuthContext | null> {
  const session = await auth();
  if (!session.userId) {
    return null;
  }

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
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username,
    image: clerkUser.imageUrl,
  });

  return {
    userId: session.userId,
    user,
  };
}
