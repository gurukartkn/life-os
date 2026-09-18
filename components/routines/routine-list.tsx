import { RoutineCard } from "@/components/routines/routine-card";

export type RoutineCardData = {
  id: string;
  title: string;
  cadence: string;
  totalCount: number;
  doneCount: number;
};

export function RoutineList({ routines }: { routines: RoutineCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {routines.map((routine) => (
        <RoutineCard key={routine.id} {...routine} />
      ))}
    </div>
  );
}
