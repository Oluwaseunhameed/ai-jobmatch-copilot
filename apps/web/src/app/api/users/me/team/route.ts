import { NextResponse } from 'next/server';
import { getOrCreateTeamForOwner, listTeamsForUser } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const teams = await listTeamsForUser(app.user.id);
  return NextResponse.json({ teams }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    const team = await getOrCreateTeamForOwner(
      app.user.id,
      typeof body.name === 'string' ? body.name : undefined,
    );
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create team';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
