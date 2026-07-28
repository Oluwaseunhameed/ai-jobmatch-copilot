import { prisma } from '@jobmatch/database';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { LocaleProvider } from '@/components/i18n/locale-provider';
import { isAdminAppUser, requireAppUser } from '@/lib/auth';
import { isLocale } from '@jobmatch/i18n';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await requireAppUser();

  if (!app) {
    redirect('/login');
  }

  const preferences =
    app.user.preferences ??
    (await prisma.userPreference.findUnique({ where: { userId: app.user.id } }));

  if (!preferences?.onboardingCompleted) {
    redirect('/onboarding');
  }

  const locale = isLocale(preferences.locale) ? preferences.locale : 'en';

  return (
    <LocaleProvider initialLocale={locale as 'en' | 'es' | 'fr' | 'de'}>
      <AppShell showAdmin={isAdminAppUser(app.user)}>{children}</AppShell>
    </LocaleProvider>
  );
}
