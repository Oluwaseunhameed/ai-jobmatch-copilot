import { redirect } from 'next/navigation';

import { PortfolioHubView } from '@/components/portfolio/portfolio-hub-view';
import { requireAppUser } from '@/lib/auth';
import { getCachedPortfolioBrief } from '@/lib/cache/jobmatch-hubs-cache';

export default async function PortfolioPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const brief = await getCachedPortfolioBrief(app.user.id);
  return <PortfolioHubView brief={brief} />;
}
