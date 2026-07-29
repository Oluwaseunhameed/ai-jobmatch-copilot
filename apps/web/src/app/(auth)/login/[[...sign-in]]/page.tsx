import { auth } from '@clerk/nextjs/server';
import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

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
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border/80 bg-card/40 p-6 text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">Finishing sign-in</h1>
        <p className="text-sm text-muted-foreground">
          Your Clerk session is ready, but your account profile is still syncing. Wait a moment and
          refresh — or open the dashboard again.
        </p>
        <a
          href="/dashboard"
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Continue to dashboard
        </a>
      </div>
    );
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
