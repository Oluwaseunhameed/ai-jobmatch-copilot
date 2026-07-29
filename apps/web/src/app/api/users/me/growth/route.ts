import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { getCachedCareerGrowthHub } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const hub = await getCachedCareerGrowthHub(app.user.id);
  return NextResponse.json(hub, { headers: { 'Cache-Control': 'no-store' } });
}
