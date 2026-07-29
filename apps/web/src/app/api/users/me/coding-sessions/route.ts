import { NextResponse } from 'next/server';
import { createCodingSession } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedCodingSessions,
  invalidateCodingCache,
} from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get('jobId');
  const sessions = await getCachedCodingSessions(app.user.id);
  const filtered = jobId ? sessions.filter((s) => s.jobId === jobId) : sessions;
  return NextResponse.json(
    { codingSessions: filtered },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: {
    jobId?: string | null;
    styles?: string[];
    difficulties?: string[];
    limit?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const session = await createCodingSession({
      userId: app.user.id,
      jobId: body.jobId,
      styles: body.styles,
      difficulties: body.difficulties,
      limit: body.limit,
    });
    await invalidateCodingCache(app.user.id);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create coding session';
    const status = message === 'Job not found' ? 404 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
