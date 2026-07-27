import { getPortfolioBrief } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { PortfolioHubView } from '@/components/portfolio/portfolio-hub-view';
import { requireAppUser } from '@/lib/auth';

export default async function PortfolioPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const brief = await getPortfolioBrief(app.user.id);
  return <PortfolioHubView brief={brief} />;
}
