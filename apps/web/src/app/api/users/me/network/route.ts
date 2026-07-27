import { NextResponse } from 'next/server';
import { createNetworkingContact, getNetworkingHub } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const hub = await getNetworkingHub(app.user.id);
  return NextResponse.json(hub, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    const contact = await createNetworkingContact({
      userId: app.user.id,
      data: {
        fullName: String(body.fullName ?? ''),
        companyId: (body.companyId as string | null | undefined) ?? null,
        companyName: (body.companyName as string | null | undefined) ?? null,
        roleType: body.roleType as string | undefined,
        title: (body.title as string | null | undefined) ?? null,
        profileUrl: (body.profileUrl as string | null | undefined) ?? null,
        email: (body.email as string | null | undefined) ?? null,
        status: body.status as string | undefined,
        notes: (body.notes as string | null | undefined) ?? null,
        relatedJobId: (body.relatedJobId as string | null | undefined) ?? null,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create contact';
    const status = message === 'Company not found' ? 404 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
