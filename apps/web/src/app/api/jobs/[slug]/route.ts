import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { getJobBySlug } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { slug } = await params;
  const job = await getJobBySlug(slug, app.user.id);

  if (!job) {
    return NextResponse.json({ error: { message: 'Job not found' } }, { status: 404 });
  }

  // Fire-and-forget view tracking; don't fail the page load if it errors.
  prisma.jobInteraction
    .upsert({
      where: {
        userId_jobId_type: { userId: app.user.id, jobId: job.id, type: 'viewed' },
      },
      update: {},
      create: { userId: app.user.id, jobId: job.id, type: 'viewed' },
    })
    .catch(() => undefined);

  return NextResponse.json(job, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
