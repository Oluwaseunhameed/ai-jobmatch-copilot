import { AppearanceSettingsForm } from '@/components/settings/appearance-settings-form';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function AppearanceSettingsPage() {
  return (
    <div>
      <SettingsNav />
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Appearance</h2>
      <AppearanceSettingsForm />
    </div>
  );
}
