import { getCodingSession } from '@jobmatch/job-search';
import { notFound, redirect } from 'next/navigation';

import { CodingPracticeView } from '@/components/practice/coding-practice-view';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export default async function CodingPracticeSessionPage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const { id } = await params;
  const session = await getCodingSession(app.user.id, id);
  if (!session) notFound();

  return <CodingPracticeView session={session} />;
}
