import { NextResponse } from 'next/server';
import { createInterviewPrep, listInterviewPreps } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get('jobId');
  const preps = await listInterviewPreps(app.user.id);
  const filtered = jobId ? preps.filter((p) => p.jobId === jobId) : preps;
  return NextResponse.json(
    { interviewPreps: filtered },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: { jobId?: string; categories?: string[] };
  try {
    body = (await request.json()) as { jobId?: string; categories?: string[] };
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  if (!body.jobId?.trim()) {
    return NextResponse.json({ error: { message: 'jobId is required' } }, { status: 400 });
  }

  try {
    const prep = await createInterviewPrep({
      userId: app.user.id,
      jobId: body.jobId.trim(),
      categories: body.categories,
    });
    return NextResponse.json(prep, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create interview prep';
    const status = message === 'Job not found' ? 404 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
