import { SupportLookupView } from '@/components/support/support-lookup-view';

export default function SupportPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Support</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Look up user accounts for billing and onboarding support.
      </p>
      <SupportLookupView />
    </div>
  );
}
