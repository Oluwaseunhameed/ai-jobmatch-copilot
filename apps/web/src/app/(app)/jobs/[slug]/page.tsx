import { notFound } from 'next/navigation';
import { prisma } from '@jobmatch/database';
import { getJobBySlug } from '@jobmatch/job-search';

import { JobDetail } from '@/components/jobs/job-detail';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ slug: string }> };

export default async function JobDetailPage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) notFound();

  const { slug } = await params;
  const job = await getJobBySlug(slug, app.user.id);
  if (!job) notFound();

  // The detail page loads the job in this RSC — it never hits GET /api/jobs/[slug],
  // so record the view here. Await so it isn't dropped when the response finishes.
  try {
    await prisma.jobInteraction.upsert({
      where: {
        userId_jobId_type: { userId: app.user.id, jobId: job.id, type: 'viewed' },
      },
      update: {},
      create: { userId: app.user.id, jobId: job.id, type: 'viewed' },
    });
  } catch {
    // Don't block the page if tracking fails.
  }

  return <JobDetail job={job} />;
}
