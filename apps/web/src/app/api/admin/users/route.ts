import { NextResponse } from 'next/server';
import { listAdminUsers } from '@jobmatch/job-search';

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

  const users = await listAdminUsers();
  return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store' } });
}
