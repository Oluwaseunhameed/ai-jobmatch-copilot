import { getNetworkingHub } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { NetworkHubView } from '@/components/network/network-hub-view';
import { requireAppUser } from '@/lib/auth';

export default async function NetworkPage() {
  const app = await requireAppUser();
  if (!app) redirect('/login');

  const hub = await getNetworkingHub(app.user.id);
  return <NetworkHubView hub={hub} />;
}
