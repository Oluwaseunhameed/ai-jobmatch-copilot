'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { getPreferences, updatePreferences, type UserPreferences } from '@/lib/api-client';

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
    </div>
  );
}

export function NotificationsSettingsForm() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getPreferences().then(setPrefs);
  }, []);

  const save = async () => {
    if (!prefs) return;
    setLoading(true);
    await updatePreferences({
      emailJobAlerts: prefs.emailJobAlerts,
      emailApplicationUpdates: prefs.emailApplicationUpdates,
      emailWeeklyDigest: prefs.emailWeeklyDigest,
      emailMarketing: prefs.emailMarketing,
      pushEnabled: prefs.pushEnabled,
    });
    setLoading(false);
    setSaved(true);
  };

  if (!prefs) {
    return (
      <div role="status" aria-live="polite" className="max-w-lg space-y-4">
        <span className="sr-only">Loading notification preferences</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px] w-full rounded-lg" />
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Toggle
        id="app-updates"
        label="Application updates"
        description="Resume optimisations, cover-letter drafts, stage changes, and idle-application reminders"
        checked={prefs.emailApplicationUpdates}
        onChange={(v) => setPrefs({ ...prefs, emailApplicationUpdates: v })}
      />
      <Toggle
        id="digest"
        label="Weekly digest"
        description="Summary of your job search activity (coming soon)"
        checked={prefs.emailWeeklyDigest}
        onChange={(v) => setPrefs({ ...prefs, emailWeeklyDigest: v })}
      />
      <Toggle
        id="job-alerts"
        label="Job alerts"
        description="Email when new jobs match your saved searches (manage searches on Jobs)"
        checked={prefs.emailJobAlerts}
        onChange={(v) => setPrefs({ ...prefs, emailJobAlerts: v })}
      />
      <Toggle
        id="marketing"
        label="Product tips & updates"
        description="Occasional emails about new features"
        checked={prefs.emailMarketing}
        onChange={(v) => setPrefs({ ...prefs, emailMarketing: v })}
      />
      <Toggle
        id="push"
        label="Push notifications"
        description="Browser push notifications (requires permission)"
        checked={prefs.pushEnabled}
        onChange={(v) => setPrefs({ ...prefs, pushEnabled: v })}
      />
      {saved && <p className="text-sm text-success">Notification preferences saved.</p>}
      <Button onClick={() => void save()} disabled={loading} className="min-w-[130px]">
        {loading ? <Spinner label="Saving changes" /> : 'Save changes'}
      </Button>
    </div>
  );
}
