import { getPortfolioProject } from '@jobmatch/job-search';
import { notFound, redirect } from 'next/navigation';

import { PortfolioProjectEditor } from '@/components/portfolio/portfolio-project-editor';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export default async function PortfolioProjectPage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const { id } = await params;
  if (id === 'new') {
    return <PortfolioProjectEditor project={null} />;
  }

  const project = await getPortfolioProject(app.user.id, id);
  if (!project) notFound();

  return <PortfolioProjectEditor project={project} />;
}
