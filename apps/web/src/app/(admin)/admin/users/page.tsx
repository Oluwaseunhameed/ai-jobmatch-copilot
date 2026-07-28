import { listAdminUsers } from '@jobmatch/job-search';
import { redirect } from 'next/navigation';

import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { requireAdmin } from '@/lib/auth';

export default async function AdminUsersPage() {
  const gate = await requireAdmin();
  if (gate.status !== 'ok') redirect('/login');

  const users = await listAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Latest {users.length} accounts. Change roles carefully — demoting yourself is blocked.
        </p>
      </div>
      <AdminUsersTable users={users} currentUserId={gate.app.userId} />
    </div>
  );
}
