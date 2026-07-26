import { notFound } from 'next/navigation';
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

  return <JobDetail job={job} />;
}
