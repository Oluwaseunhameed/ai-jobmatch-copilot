'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <ClerkSignOutButton signOutOptions={{ redirectUrl: '/' }}>
      <Button variant="ghost" size="sm">
        Sign out
      </Button>
    </ClerkSignOutButton>
  );
}
