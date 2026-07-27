import { getCareerGrowthHub } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { CareerGrowthView } from '@/components/growth/career-growth-view';
import { requireAppUser } from '@/lib/auth';

export default async function CareerGrowthPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const hub = await getCareerGrowthHub(app.user.id);
  return <CareerGrowthView hub={hub} />;
}
