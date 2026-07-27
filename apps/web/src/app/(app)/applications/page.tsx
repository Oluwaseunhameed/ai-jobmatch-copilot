import { ApplicationBoard } from '@/components/applications/application-board';

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Application tracker</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Keep every stage in view
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Move roles from preparing through interviews and offers. Add notes and jump back to the
          job or apply link when you need them.
        </p>
      </div>
      <ApplicationBoard />
    </div>
  );
}
