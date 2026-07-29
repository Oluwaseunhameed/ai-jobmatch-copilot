import { redirect } from 'next/navigation';

import { CodingHubView } from '@/components/practice/coding-hub-view';
import { requireAppUser } from '@/lib/auth';
import { getCachedCodingSessions } from '@/lib/cache/jobmatch-hubs-cache';

export default async function CodingPracticeHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const sessions = await getCachedCodingSessions(app.user.id);
  return <CodingHubView sessions={sessions} />;
}
