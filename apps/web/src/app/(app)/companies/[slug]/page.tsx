import { notFound } from 'next/navigation';
import { getCompanyProfile } from '@jobmatch/job-search';

import { CompanyProfileView } from '@/components/companies/company-profile-view';
import { requireAppUser } from '@/lib/auth';

type Params = { params: Promise<{ slug: string }> };

export default async function CompanyProfilePage({ params }: Params) {
  const app = await requireAppUser();
  if (!app) notFound();

  const { slug } = await params;
  const profile = await getCompanyProfile(slug, app.user.id);
  if (!profile) notFound();

  return <CompanyProfileView profile={profile} />;
}
