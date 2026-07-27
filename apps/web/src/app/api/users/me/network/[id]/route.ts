import { NextResponse } from 'next/server';
import {
  deleteNetworkingContact,
  getNetworkingContact,
  updateNetworkingContact,
} from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const contact = await getNetworkingContact(app.user.id, id);
  if (!contact) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(contact, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    const existing = await getNetworkingContact(app.user.id, id);
    if (!existing) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }

    const contact = await updateNetworkingContact({
      userId: app.user.id,
      id,
      data: {
        fullName: String(body.fullName ?? existing.fullName),
        companyId:
          body.companyId === undefined
            ? existing.companyId
            : ((body.companyId as string | null) ?? null),
        companyName:
          body.companyName === undefined
            ? existing.companyName
            : ((body.companyName as string | null) ?? null),
        roleType: (body.roleType as string | undefined) ?? existing.roleType,
        title:
          body.title === undefined ? existing.title : ((body.title as string | null) ?? null),
        profileUrl:
          body.profileUrl === undefined
            ? existing.profileUrl
            : ((body.profileUrl as string | null) ?? null),
        email:
          body.email === undefined ? existing.email : ((body.email as string | null) ?? null),
        status: (body.status as string | undefined) ?? existing.status,
        notes:
          body.notes === undefined ? existing.notes : ((body.notes as string | null) ?? null),
        relatedJobId:
          body.relatedJobId === undefined
            ? existing.relatedJobId
            : ((body.relatedJobId as string | null) ?? null),
      },
    });

    return NextResponse.json(contact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update contact';
    const status = message === 'Company not found' ? 404 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteNetworkingContact(app.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
