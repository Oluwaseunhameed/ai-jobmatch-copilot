import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';

import { requireAppUser } from '@/lib/auth';
import { buildTextPdf, pdfResponse } from '@/lib/text-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;

  const draft = await prisma.applicationDraft.findFirst({
    where: { id, userId: app.user.id },
    include: {
      job: { include: { company: { select: { name: true } } } },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: { message: 'Draft not found' } }, { status: 404 });
  }

  if (draft.status !== 'ready' || !draft.coverLetter?.trim()) {
    return NextResponse.json(
      { error: { message: 'Cover letter is not ready for export' } },
      { status: 400 },
    );
  }

  const filename = `cover-letter-${draft.job.slug}.pdf`.replace(/[^\w.-]+/g, '-');
  const bytes = buildTextPdf({
    title: `Cover letter — ${draft.job.title}`,
    subtitle: `${draft.job.company.name} · AI JobMatch Copilot`,
    body: draft.coverLetter.trim(),
  });

  return pdfResponse(bytes, filename);
}
