import { NextResponse } from 'next/server';
import { createCoachSession, listCoachSessions } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const coachSessions = await listCoachSessions(app.user.id);
  return NextResponse.json(
    { coachSessions },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: { focus?: string; message?: string | null };
  try {
    body = (await request.json()) as { focus?: string; message?: string | null };
  } catch {
    body = {};
  }

  try {
    const session = await createCoachSession({
      userId: app.user.id,
      focus: body.focus,
      message: body.message,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create coach session';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
