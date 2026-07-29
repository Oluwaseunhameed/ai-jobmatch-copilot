import { NextResponse } from 'next/server';
import {
  deleteCodingSession,
  getCodingSession,
  runCodingReview,
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
    action?: string;
    attempts?: Array<{
      problemId: string;
      status: 'todo' | 'attempted' | 'solved' | 'skipped';
      minutesSpent?: number | null;
      selfRating?: number | null;
      notes?: string | null;
      code?: string | null;
      review?: string | null;
      reviewSource?: string | null;
    }>;
    problemId?: string;
    code?: string;
    language?: string | null;
    status?: 'todo' | 'attempted' | 'solved' | 'skipped';
    selfRating?: number | null;
    minutesSpent?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    if (body.action === 'review') {
      if (!body.problemId?.trim() || !body.code?.trim()) {
        return NextResponse.json(
          { error: { message: 'problemId and code are required for review' } },
          { status: 400 },
        );
      }
      const session = await runCodingReview({
        userId: app.user.id,
        id,
        problemId: body.problemId.trim(),
        code: body.code,
        language: body.language,
        status: body.status,
        selfRating: body.selfRating,
        minutesSpent: body.minutesSpent,
      });
      if (!session) {
        return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    if (!Array.isArray(body.attempts)) {
      return NextResponse.json(
        { error: { message: 'attempts array is required (or action: review)' } },
        { status: 400 },
      );
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
        code: a.code ?? null,
        review: a.review ?? null,
        reviewSource: a.reviewSource ?? null,
      })),
    });
    if (!session) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
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
