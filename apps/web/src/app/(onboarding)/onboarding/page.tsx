'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { completeOnboarding, updatePreferences } from '@/lib/api-client';

export default function OnboardingPage() {
  const router = useRouter();
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  );
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    await updatePreferences({ timezone });
    await completeOnboarding();
    setLoading(false);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Welcome to AI JobMatch Copilot</CardTitle>
        <CardDescription>
          Let&apos;s set up a few preferences before you start your job search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Your timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used for interview reminders and job alert timing.
          </p>
        </div>
        <Button className="w-full" onClick={() => void finish()} disabled={loading}>
          {loading ? <Spinner label="Setting up your workspace" /> : 'Continue to dashboard'}
        </Button>
      </CardContent>
    </Card>
  );
}
