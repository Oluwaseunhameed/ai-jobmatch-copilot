import { getCoachSession } from '@jobmatch/job-search';
import { notFound, redirect } from 'next/navigation';

import { CoachSessionView } from '@/components/coach/coach-session-view';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export default async function CareerCoachSessionPage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const { id } = await params;
  const session = await getCoachSession(app.user.id, id);
  if (!session) notFound();

  return <CoachSessionView session={session} />;
}
