import { NextResponse } from 'next/server';
import { listAdminCompanies } from '@jobmatch/job-search';

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

  const companies = await listAdminCompanies();
  return NextResponse.json({ companies }, { headers: { 'Cache-Control': 'no-store' } });
}
