import { prisma } from '@jobmatch/database';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { LocaleProvider } from '@/components/i18n/locale-provider';
import { requireAdmin } from '@/lib/auth';
import { isLocale } from '@jobmatch/i18n';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdmin();
  if (gate.status === 'unauthorized') {
    redirect('/login');
  }
  if (gate.status === 'forbidden') {
    redirect('/dashboard');
  }

  const preferences =
    gate.app.user.preferences ??
    (await prisma.userPreference.findUnique({ where: { userId: gate.app.user.id } }));

  const localeRaw = preferences?.locale ?? 'en';
  const locale = isLocale(localeRaw) ? localeRaw : 'en';

  return (
    <LocaleProvider initialLocale={locale as 'en' | 'es' | 'fr' | 'de'}>
      <AdminShell>{children}</AdminShell>
    </LocaleProvider>
  );
}
