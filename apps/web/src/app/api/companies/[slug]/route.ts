import { NextResponse } from 'next/server';
import { getCompanyProfile } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { slug } = await params;
  const profile = await getCompanyProfile(slug, app.user.id);

  if (!profile) {
    return NextResponse.json({ error: { message: 'Company not found' } }, { status: 404 });
  }

  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}
