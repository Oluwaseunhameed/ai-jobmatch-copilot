import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { getCachedTrendingJobs } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysRaw = Number(url.searchParams.get('days'));
  const limitRaw = Number(url.searchParams.get('limit'));
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 14;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 6;

  const jobs = await getCachedTrendingJobs({
    userId: app.user.id,
    days,
    limit,
  });

  return NextResponse.json(
    { jobs, days },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
