import { UserProfile } from '@clerk/nextjs';

import { SettingsNav } from '@/components/settings/settings-nav';

export default function AccountSettingsPage() {
  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Account</h2>
      <p className="mb-6 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Manage your name, email, password, connected accounts, and security via Clerk.
      </p>
      <div className="w-full max-w-3xl overflow-visible rounded-xl border border-border bg-card/80 shadow-soft">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'w-full max-w-none',
              cardBox: 'w-full max-w-none shadow-none',
              card: 'w-full shadow-none border-0',
              navbar: 'hidden',
              scrollBox: 'w-full',
            },
          }}
        />
      </div>
    </div>
  );
}
