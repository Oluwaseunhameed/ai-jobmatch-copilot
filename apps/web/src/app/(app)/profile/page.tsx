import { ProfileForm } from '@/components/profile/profile-form';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Career profile</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Build your source of truth
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          One structured profile powers matching, resume optimization, and applications. Keep it
          current — AI uses this as ground truth.
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
