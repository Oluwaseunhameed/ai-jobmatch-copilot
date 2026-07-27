import { NextResponse } from 'next/server';
import { getJobInsights } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { slug } = await params;
  const insights = await getJobInsights(slug, app.user.id);

  if (!insights) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  return NextResponse.json(insights, { headers: { 'Cache-Control': 'no-store' } });
}
