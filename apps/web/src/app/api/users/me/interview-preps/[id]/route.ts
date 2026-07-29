import { NextResponse } from 'next/server';
import {
  deleteInterviewPrep,
  getInterviewPrep,
  runInterviewMockTurn,
  updateInterviewPractice,
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
  const prep = await getInterviewPrep(app.user.id, id);
  if (!prep) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(prep, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  let body: {
    action?: string;
    practice?: Array<{ questionId: string; selfRating: number; notes?: string | null }>;
    questionId?: string;
    answer?: string;
    selfRating?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    if (body.action === 'mock_turn') {
      if (!body.questionId?.trim() || !body.answer?.trim()) {
        return NextResponse.json(
          { error: { message: 'questionId and answer are required for mock_turn' } },
          { status: 400 },
        );
      }
      const prep = await runInterviewMockTurn({
        userId: app.user.id,
        id,
        questionId: body.questionId.trim(),
        answer: body.answer,
        selfRating: body.selfRating,
      });
      if (!prep) {
        return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
      }
      return NextResponse.json(prep);
    }

    if (!Array.isArray(body.practice)) {
      return NextResponse.json(
        { error: { message: 'practice array is required (or action: mock_turn)' } },
        { status: 400 },
      );
    }

    const prep = await updateInterviewPractice({
      userId: app.user.id,
      id,
      practice: body.practice,
    });
    if (!prep) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }

    return NextResponse.json(prep);
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
  const ok = await deleteInterviewPrep(app.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
