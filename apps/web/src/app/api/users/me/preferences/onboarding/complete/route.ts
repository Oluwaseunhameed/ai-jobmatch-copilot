import { prisma } from '@jobmatch/database';
import { maybeRewardReferral } from '@jobmatch/job-search';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';

export async function POST() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const preferences = await prisma.userPreference.upsert({
    where: { userId: app.user.id },
    create: { userId: app.user.id, onboardingCompleted: true },
    update: { onboardingCompleted: true },
  });

  try {
    await maybeRewardReferral(app.user.id);
  } catch {
    // best-effort referral reward
  }

  return NextResponse.json(preferences);
}
