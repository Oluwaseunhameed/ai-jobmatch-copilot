import { NextResponse } from 'next/server';
import { addTeamMember } from '@jobmatch/job-search';
import type { TeamMemberRole } from '@jobmatch/types';

import { requireAppUser } from '@/lib/auth';
import { resolveUserPlanId } from '@/lib/billing/limits';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const planId = await resolveUserPlanId(app.user.id);
  if (planId !== 'team') {
    return NextResponse.json(
      {
        error: {
          message: 'Team plan required. Upgrade at Settings → Plan.',
          code: 'TEAM_PLAN_REQUIRED',
          upgradeUrl: '/settings/plan',
        },
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  if (!email) {
    return NextResponse.json({ error: { message: 'Email is required' } }, { status: 400 });
  }

  try {
    const membership = await addTeamMember({
      ownerUserId: app.user.id,
      email,
      role: (body.role as TeamMemberRole | undefined) ?? 'member',
    });
    return NextResponse.json(membership, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add member';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
