import { SettingsNav } from '@/components/settings/settings-nav';
import { PlanUpgradePanel } from '@/components/settings/plan-upgrade-panel';

export default function PlanSettingsPage() {
  return (
    <div>
      <SettingsNav />
      <h2 className="font-display text-2xl font-semibold tracking-tight">Plan</h2>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Free includes core job-search features with monthly AI limits. Pro unlocks higher ceilings —
        checkout via Lemon Squeezy worldwide or Paystack in Nigeria.
      </p>
      <PlanUpgradePanel />
    </div>
  );
}
