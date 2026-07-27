import { NextResponse } from 'next/server';
import {
  deleteCodingSession,
  getCodingSession,
  updateCodingAttempts,
} from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const session = await getCodingSession(app.user.id, id);
  if (!session) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  let body: {
    attempts?: Array<{
      problemId: string;
      status: 'todo' | 'attempted' | 'solved' | 'skipped';
      minutesSpent?: number | null;
      selfRating?: number | null;
      notes?: string | null;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  if (!Array.isArray(body.attempts)) {
    return NextResponse.json({ error: { message: 'attempts array is required' } }, { status: 400 });
  }

  const session = await updateCodingAttempts({
    userId: app.user.id,
    id,
    attempts: body.attempts.map((a) => ({
      problemId: a.problemId,
      status: a.status,
      minutesSpent: a.minutesSpent ?? null,
      selfRating: a.selfRating ?? null,
      notes: a.notes ?? null,
    })),
  });
  if (!session) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCodingSession(app.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
