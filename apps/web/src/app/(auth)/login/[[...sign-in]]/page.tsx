import { auth } from '@clerk/nextjs/server';
import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

import { FinishingSignIn } from '@/components/auth/finishing-sign-in';
import { requireAppUser } from '@/lib/auth';

export default async function LoginPage() {
  const session = await auth();

  // Avoid Clerk SignIn auto-bounce ↔ layout /login redirect loops when the
  // session exists but the app user / DB path is still settling.
  if (session.userId) {
    const app = await requireAppUser();
    if (app) {
      redirect('/dashboard');
    }
    return <FinishingSignIn />;
  }

  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/register"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: 'mx-auto w-full',
          cardBox: 'w-full',
        },
      }}
    />
  );
}
