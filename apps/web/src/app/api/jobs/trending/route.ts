import { NextResponse } from 'next/server';
import { getTrendingJobs } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysRaw = Number(url.searchParams.get('days'));
  const limitRaw = Number(url.searchParams.get('limit'));

  const jobs = await getTrendingJobs({
    days: Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : undefined,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    userId: app.user.id,
  });

  return NextResponse.json(
    { jobs, days: Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 14 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
