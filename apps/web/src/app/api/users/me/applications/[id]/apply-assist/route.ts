import { NextResponse } from 'next/server';
import {
  approveApplyFillPlan,
  confirmApplySubmitted,
  getOrCreateApplyAssist,
  markApplyOpened,
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
  const session = await getOrCreateApplyAssist(app.user.id, id);
  if (!session) {
    return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
  }

  return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  let body: { action?: string; submitNote?: string | null };
  try {
    body = (await request.json()) as { action?: string; submitNote?: string | null };
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const action = body.action?.trim();
  if (!action) {
    return NextResponse.json(
      { error: { message: 'action is required (open | approve_fill | confirm_submitted)' } },
      { status: 400 },
    );
  }

  try {
    if (action === 'open') {
      const session = await markApplyOpened(app.user.id, id);
      if (!session) {
        return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    if (action === 'approve_fill') {
      const session = await approveApplyFillPlan(app.user.id, id);
      if (!session) {
        return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    if (action === 'confirm_submitted') {
      const session = await confirmApplySubmitted({
        userId: app.user.id,
        applicationId: id,
        submitNote: body.submitNote,
      });
      if (!session) {
        return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    return NextResponse.json({ error: { message: 'Unknown action' } }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Apply assist failed';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
