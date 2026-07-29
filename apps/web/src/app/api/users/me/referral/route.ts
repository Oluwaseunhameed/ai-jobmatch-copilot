import { NextResponse } from 'next/server';
import { getOrCreateReferralSummary } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const summary = await getOrCreateReferralSummary(app.user.id);
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load referral';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
