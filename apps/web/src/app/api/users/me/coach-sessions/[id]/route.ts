import { NextResponse } from 'next/server';
import {
  appendCoachMessage,
  deleteCoachSession,
  getCoachSession,
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
  const session = await getCoachSession(app.user.id, id);
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
  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: { message: 'message is required' } }, { status: 400 });
  }

  try {
    const session = await appendCoachMessage({
      userId: app.user.id,
      id,
      message: body.message,
    });
    if (!session) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send message';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCoachSession(app.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
