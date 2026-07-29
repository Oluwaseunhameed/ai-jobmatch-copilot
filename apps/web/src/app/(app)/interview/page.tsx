import { redirect } from 'next/navigation';

import { InterviewHubView } from '@/components/interview/interview-hub-view';
import { requireAppUser } from '@/lib/auth';
import { getCachedInterviewPreps } from '@/lib/cache/jobmatch-hubs-cache';

export default async function InterviewHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const preps = await getCachedInterviewPreps(app.user.id);
  return <InterviewHubView preps={preps} />;
}
