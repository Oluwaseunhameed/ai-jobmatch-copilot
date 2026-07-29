import { NextResponse } from 'next/server';
import { markNotificationRead } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const notification = await markNotificationRead(app.user.id, id);
  if (!notification) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(notification);
}
