import { CreateRoutineForm } from "@/components/routines/create-routine-form";

export default function NewRoutinePage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-page-title text-ink">New routine</h1>
      <CreateRoutineForm />
    </div>
  );
}
