import { getInterviewPrep } from '@jobmatch/job-search';
import { notFound, redirect } from 'next/navigation';

import { InterviewPracticeView } from '@/components/interview/interview-practice-view';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export default async function InterviewPracticePage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const { id } = await params;
  const prep = await getInterviewPrep(app.user.id, id);
  if (!prep) notFound();

  return <InterviewPracticeView prep={prep} />;
}
