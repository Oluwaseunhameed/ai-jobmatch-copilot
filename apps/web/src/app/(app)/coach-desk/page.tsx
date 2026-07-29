import { CoachDeskView } from '@/components/coach-desk/coach-desk-view';

export default function CoachDeskPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Coach desk</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        View assigned members and link new users by email.
      </p>
      <CoachDeskView />
    </div>
  );
}
