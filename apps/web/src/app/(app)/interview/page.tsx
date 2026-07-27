import { listInterviewPreps } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { InterviewHubView } from '@/components/interview/interview-hub-view';
import { requireAppUser } from '@/lib/auth';

export default async function InterviewHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const preps = await listInterviewPreps(app.user.id);
  return <InterviewHubView preps={preps} />;
}
