import { WorkoutCard } from "@/components/fitness/workout-card";

export type WorkoutCardData = {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: string[];
  lastLogged: string | null;
};

export function WorkoutList({ workouts }: { workouts: WorkoutCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} {...workout} />
      ))}
    </div>
  );
}
