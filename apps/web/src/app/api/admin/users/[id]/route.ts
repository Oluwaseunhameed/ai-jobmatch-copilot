import { NextResponse } from 'next/server';
import { normalizeAppRole, updateAdminUserRole } from '@jobmatch/job-search';

import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdmin();
  if (gate.status === 'unauthorized') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  if (gate.status === 'forbidden') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const role = normalizeAppRole(body.role);
  if (!role) {
    return NextResponse.json({ error: { message: 'Invalid role' } }, { status: 400 });
  }

  try {
    const user = await updateAdminUserRole({
      userId: id,
      role,
      actorUserId: gate.app.userId,
    });
    return NextResponse.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update role';
    const status =
      message === 'User not found' ? 404 : message === 'Cannot demote yourself' ? 400 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
