import { prisma } from '@jobmatch/database';
import { redirect } from 'next/navigation';

import { AuthLayout } from '@/components/auth/auth-layout';
import { requireAppUser } from '@/lib/auth';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const app = await requireAppUser();

  if (!app) {
    redirect('/login');
  }

  const preferences = await prisma.userPreference.findUnique({
    where: { userId: app.user.id },
  });

  if (preferences?.onboardingCompleted) {
    redirect('/dashboard');
  }

  return <AuthLayout>{children}</AuthLayout>;
}
