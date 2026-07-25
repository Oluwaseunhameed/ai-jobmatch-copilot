import Link from 'next/link';

import { SettingsNav } from '@/components/settings/settings-nav';
import { Button } from '@/components/ui/button';

export default function SecuritySettingsPage() {
  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Security</h2>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Password, two-factor authentication, active sessions, and connected OAuth accounts are
        managed in your Clerk account profile.
      </p>
      <Button asChild>
        <Link href="/settings/account">Open account security</Link>
      </Button>
    </div>
  );
}
