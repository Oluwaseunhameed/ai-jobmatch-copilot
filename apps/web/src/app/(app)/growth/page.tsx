import { redirect } from 'next/navigation';

import { CareerGrowthView } from '@/components/growth/career-growth-view';
import { requireAppUser } from '@/lib/auth';
import { getCachedCareerGrowthHub } from '@/lib/cache/jobmatch-hubs-cache';

export default async function CareerGrowthPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const hub = await getCachedCareerGrowthHub(app.user.id);
  return <CareerGrowthView hub={hub} />;
}
