import { listCodingSessions } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { CodingHubView } from '@/components/practice/coding-hub-view';
import { requireAppUser } from '@/lib/auth';

export default async function CodingPracticeHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const sessions = await listCodingSessions(app.user.id);
  return <CodingHubView sessions={sessions} />;
}
