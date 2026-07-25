import { NotificationsSettingsForm } from '@/components/settings/notifications-settings-form';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function NotificationsSettingsPage() {
  return (
    <div>
      <SettingsNav />
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Notifications</h2>
      <NotificationsSettingsForm />
    </div>
  );
}
