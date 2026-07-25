'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LOCALES, type Locale } from '@jobmatch/i18n';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton, SkeletonField } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { getPreferences, updatePreferences, type UserPreferences } from '@/lib/api-client';
import { useLocale } from '@/components/i18n/locale-provider';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

export function AppearanceSettingsForm() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getPreferences().then((p) => {
      setPrefs(p);
      setTimezone(p.timezone);
      if (p.theme) setTheme(p.theme);
      if (p.locale) setLocale(p.locale as Locale);
    });
  }, [setTheme, setLocale]);

  const save = async () => {
    setLoading(true);
    await updatePreferences({
      theme: theme ?? 'system',
      locale,
      timezone,
    });
    setLoading(false);
    setSaved(true);
  };

  if (!prefs) {
    return (
      <div role="status" aria-live="polite" className="max-w-md space-y-6">
        <span className="sr-only">Loading appearance preferences</span>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <SkeletonField />
        <SkeletonField />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label>Theme</Label>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={theme === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="locale">Language</Label>
        <select
          id="locale"
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tz">Timezone</Label>
        <select
          id="tz"
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      {saved && <p className="text-sm text-success">Preferences saved.</p>}
      <Button onClick={() => void save()} disabled={loading} className="min-w-[130px]">
        {loading ? <Spinner label="Saving changes" /> : 'Save changes'}
      </Button>
    </div>
  );
}
