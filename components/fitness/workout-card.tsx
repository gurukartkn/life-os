import { Clock3 } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { DeleteWorkoutButton } from "@/components/fitness/delete-workout-button";
import { startWorkoutLog } from "@/actions/workout-logs";
import { formatRelative } from "@/lib/dates";

export function WorkoutCard({
  id,
  name,
  exerciseCount,
  muscleGroups,
  lastLogged,
}: {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: string[];
  lastLogged: string | null;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface-100 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <span className="text-heading text-ink">{name}</span>
          <span className="text-caption text-ink-faint">
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
          </span>
          {muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups.map((group) => (
                <Tag key={group}>{group}</Tag>
              ))}
            </div>
          )}
        </div>
        <DeleteWorkoutButton id={id} />
      </div>
      <span className="flex items-center gap-1.5 text-caption text-ink-faint">
        <Clock3 className="size-3.5" />
        {lastLogged ? `Last logged ${formatRelative(lastLogged)}` : "Not logged yet"}
      </span>
      <form action={startWorkoutLog}>
        <input type="hidden" name="workout_id" value={id} />
        <button
          type="submit"
          className="text-button-text flex h-[38px] w-full items-center justify-center gap-1.5 rounded-md bg-teal-soft text-teal-ink outline-none transition-colors hover:bg-teal-soft/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Start workout
        </button>
      </form>
    </div>
  );
}
