import Link from "next/link";
import { Tag } from "@/components/ui/tag";
import { buttonVariants } from "@/components/ui/button";
import { EXERCISE_TYPE_LABELS } from "@/components/fitness/exercise-list";
import { formatDateTime } from "@/lib/dates";
import type { PastWorkoutLog } from "@/lib/queries/fitness";

function formatSet(set: PastWorkoutLog["exercises"][number]["sets"][number], exerciseType: string): string {
  if (exerciseType === "cardio" && set.durationSeconds !== null) {
    return `Set ${set.setNumber}: ${set.durationSeconds}s`;
  }
  const weight = set.weight !== null ? `${set.weight} × ` : "";
  return `Set ${set.setNumber}: ${weight}${set.reps ?? "—"}`;
}

// A finished workout log, read-only: the workout as it is now, each exercise's sets
// from this log, and any exercise that has sets here but has since left the workout
// (flagged, per lib/queries/fitness.ts's getPastWorkoutLog).
export function PastLogView({ log, timeZone }: { log: PastWorkoutLog; timeZone: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-caption text-ink-faint">Workout log</span>
        <h1 className="text-page-title text-ink">{log.workoutName ?? "Ad-hoc workout"}</h1>
        <p className="text-body-sm text-ink-faint">{formatDateTime(log.performedAt, timeZone)}</p>
      </div>

      {log.notes && <p className="text-body text-ink-muted">{log.notes}</p>}

      {log.exercises.length === 0 ? (
        <p className="text-body text-ink-muted">No sets were logged for this workout.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {log.exercises.map((exercise) => (
            <div
              key={exercise.workoutExerciseId ?? exercise.exerciseId}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-100 p-5"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-heading text-ink">{exercise.exerciseName}</span>
                <Tag>{EXERCISE_TYPE_LABELS[exercise.exerciseType] ?? exercise.exerciseType}</Tag>
                {exercise.removedFromWorkout && <Tag>Removed from workout</Tag>}
                {exercise.targetSets && (
                  <span className="text-caption text-ink-faint">
                    Target: {exercise.targetSets} sets{exercise.targetReps ? ` × ${exercise.targetReps}` : ""}
                  </span>
                )}
              </div>
              {exercise.sets.length === 0 ? (
                <p className="pl-[2px] text-body-sm text-ink-faint">No sets logged.</p>
              ) : (
                <div className="flex flex-col gap-1 pl-[2px]">
                  {exercise.sets.map((set) => (
                    <span key={set.id} className="text-body-sm text-ink-muted">
                      {formatSet(set, exercise.exerciseType)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Link href="/fitness" className={buttonVariants({ variant: "outline" })}>
        Back to Fitness
      </Link>
    </div>
  );
}
