import { prisma } from '@jobmatch/database';
import { getObjectBuffer } from '@jobmatch/storage';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
  });

  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  try {
    const buffer = await getObjectBuffer(
      resume.storageKey,
      resume.storageProvider as 'local' | 's3',
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': resume.mimeType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(resume.originalFileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: { message: 'File unavailable' } }, { status: 404 });
  }
}
