import { NextResponse } from 'next/server';
import { supportLookupUser } from '@jobmatch/job-search';

import { requireSupport } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const gate = await requireSupport();
  if (gate.status === 'unauthorized') {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }
  if (gate.status === 'forbidden') {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  const email = new URL(request.url).searchParams.get('email')?.trim();
  if (!email) {
    return NextResponse.json({ error: { message: 'email query param is required' } }, { status: 400 });
  }

  const user = await supportLookupUser(email);
  if (!user) {
    return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 });
  }

  return NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } });
}
