import { listCoachSessions } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { CoachHubView } from '@/components/coach/coach-hub-view';
import { requireAppUser } from '@/lib/auth';

export default async function CareerCoachHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const sessions = await listCoachSessions(app.user.id);
  return <CoachHubView sessions={sessions} />;
}
