import { redirect } from 'next/navigation';

import { CoachHubView } from '@/components/coach/coach-hub-view';
import { requireAppUser } from '@/lib/auth';
import { getCachedCoachSessions } from '@/lib/cache/jobmatch-hubs-cache';

export default async function CareerCoachHubPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const sessions = await getCachedCoachSessions(app.user.id);
  return <CoachHubView sessions={sessions} />;
}
