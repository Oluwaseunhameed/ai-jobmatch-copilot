import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';

import { requireAppUser } from '@/lib/auth';
import { buildTextPdf, pdfResponse } from '@/lib/text-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; optId: string }> };

function textFromResultJson(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const after = (raw as { after?: { text?: unknown } }).after;
  if (after && typeof after.text === 'string' && after.text.trim()) {
    return after.text.trim();
  }
  return null;
}

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id: resumeId, optId } = await params;

  const optimization = await prisma.resumeOptimization.findFirst({
    where: { id: optId, resumeId, userId: app.user.id },
    include: {
      job: { include: { company: { select: { name: true } } } },
      version: { select: { contentText: true } },
    },
  });

  if (!optimization) {
    return NextResponse.json({ error: { message: 'Optimization not found' } }, { status: 404 });
  }

  if (optimization.status !== 'ready') {
    return NextResponse.json(
      { error: { message: 'Optimization is not ready for export' } },
      { status: 400 },
    );
  }

  const body =
    optimization.version?.contentText?.trim() ||
    textFromResultJson(optimization.resultJson);

  if (!body) {
    return NextResponse.json(
      { error: { message: 'No optimized resume text available to export' } },
      { status: 404 },
    );
  }

  const filename = `resume-optimized-${optimization.job.slug}.pdf`.replace(/[^\w.-]+/g, '-');
  const bytes = buildTextPdf({
    title: `Optimized resume — ${optimization.job.title}`,
    subtitle: `${optimization.job.company.name} · AI JobMatch Copilot`,
    body,
  });

  return pdfResponse(bytes, filename);
}
