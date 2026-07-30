import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserFromClerk } from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { invalidateAuthUserCache } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

/**
 * Force-sync Clerk session → local User. Used by the login "Finishing sign-in"
 * screen when the normal requireAppUser path lags (webhook / Redis / Clerk API).
 */
export async function POST() {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  await invalidateAuthUserCache(session.userId);

  let app = await requireAppUser();
  if (app) {
    return NextResponse.json(
      { ok: true, userId: app.user.id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        {
          error: {
            message:
              'Clerk session is active but the user profile could not be loaded. Try signing out and back in.',
          },
        },
        { status: 503 },
      );
    }

    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
      clerkUser.emailAddresses[0];

    if (!primaryEmail?.emailAddress) {
      return NextResponse.json(
        { error: { message: 'Your Clerk account is missing an email address.' } },
        { status: 422 },
      );
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

    await invalidateAuthUserCache(user.id);
    app = await requireAppUser();

    if (!app) {
      return NextResponse.json(
        {
          error: {
            message:
              'Account was created but could not be loaded yet. Wait a moment and try again.',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: true, userId: app.user.id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api/auth/sync]', {
      userId: session.userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Could not sync your account. Please try again.',
        },
      },
      { status: 500 },
    );
  }
}
