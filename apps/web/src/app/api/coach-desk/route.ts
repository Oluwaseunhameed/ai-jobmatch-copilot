import { NextResponse } from 'next/server';
import { assignCoachMember, listCoachDeskMembers } from '@jobmatch/job-search';

import { requireCoach } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireCoach();
  if (gate.status === 'unauthorized') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  if (gate.status === 'forbidden') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const members = await listCoachDeskMembers(gate.app.user.id);
  return NextResponse.json({ members }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireCoach();
  if (gate.status === 'unauthorized') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  if (gate.status === 'forbidden') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const memberEmail = String(body.memberEmail ?? body.email ?? '').trim();
  if (!memberEmail) {
    return NextResponse.json({ error: { message: 'memberEmail is required' } }, { status: 400 });
  }

  try {
    const assignment = await assignCoachMember({
      coachUserId: gate.app.user.id,
      memberEmail,
      note: typeof body.note === 'string' ? body.note : null,
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not assign member';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
