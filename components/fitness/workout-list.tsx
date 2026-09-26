import Link from "next/link";
import { Pencil, Play } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { startWorkoutLog } from "@/actions/workout-logs";
import { formatRelativeTime } from "@/lib/dates";
import { plural } from "@/lib/fitness/labels";
import type { WorkoutSummary } from "@/lib/queries/fitness";
import { cn } from "@/lib/utils";

// "Your workouts" (Workouts board): one card of 72px rows — name over "4 exercises ·
// Chest, Shoulders, Back", when it was last done, Start and Edit.
export function WorkoutList({ workouts }: { workouts: WorkoutSummary[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      {workouts.map((workout) => (
        <div
          key={workout.id}
          data-slot="workout-row"
          className="flex min-h-[72px] items-center gap-3 border-b border-border py-2 pr-3 pl-4 last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-body font-semibold text-ink">{workout.name}</span>
            <span className="truncate text-caption text-ink-muted">
              {[plural(workout.exerciseCount, "exercise"), workout.muscleGroups.join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <span className="hidden text-body-sm text-ink-muted sm:inline">
            {workout.lastDone ? `Last done ${formatRelativeTime(workout.lastDone)}` : "Not done yet"}
          </span>
          <form action={startWorkoutLog}>
            <input type="hidden" name="workout_id" value={workout.id} />
            <Button type="submit" variant="outline" size="sm" aria-label={`Start ${workout.name}`}>
              <Play strokeWidth={1.75} />
              Start
            </Button>
          </form>
          <Link
            href={`/fitness/workouts/${workout.id}/edit`}
            aria-label={`Edit ${workout.name}`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <Pencil strokeWidth={1.75} />
          </Link>
        </div>
      ))}
    </div>
  );
}
