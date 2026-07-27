import { NextResponse } from 'next/server';
import { getCareerGrowthHub } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const hub = await getCareerGrowthHub(app.user.id);
  return NextResponse.json(hub, { headers: { 'Cache-Control': 'no-store' } });
}
