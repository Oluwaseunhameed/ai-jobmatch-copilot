import { NextResponse } from 'next/server';
import { listAdminFeatureFlags, setAdminFeatureFlag } from '@jobmatch/job-search';

import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.status === 'unauthorized') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  if (gate.status === 'forbidden') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const flags = await listAdminFeatureFlags();
  return NextResponse.json({ flags }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
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

  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!key) {
    return NextResponse.json({ error: { message: 'key is required' } }, { status: 400 });
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: { message: 'enabled must be a boolean' } }, { status: 400 });
  }

  const rolloutPercentRaw = body.rolloutPercent;
  const rolloutPercent: number | null | undefined =
    rolloutPercentRaw === undefined
      ? undefined
      : rolloutPercentRaw === null
        ? null
        : typeof rolloutPercentRaw === 'number'
          ? rolloutPercentRaw
          : null;

  try {
    const flag = await setAdminFeatureFlag({
      key,
      enabled: body.enabled,
      rolloutPercent,
      actorUserId: gate.app.userId,
    });
    return NextResponse.json(flag);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update flag';
    const status = message === 'Feature flag not found' ? 404 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
