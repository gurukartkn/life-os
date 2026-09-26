import Link from "next/link";
import { Archive, CircleCheck, CircleMinus, Pencil } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { formatRelativeTime, formatShortDate } from "@/lib/dates";
import { exerciseSummary, sessionMinutes, sessionSummary } from "@/lib/fitness/labels";
import type { PastLogExercise, PastWorkoutLog } from "@/lib/queries/fitness";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")} min` : `${seconds} sec`;
}

function ExerciseSets({ exercise }: { exercise: PastLogExercise }) {
  const isCardio = exercise.exerciseType === "cardio";

  if (exercise.sets.length === 0) {
    return (
      <p className="flex h-8 items-center gap-1.5 text-body-sm text-ink-muted">
        <CircleMinus className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        No sets logged
      </p>
    );
  }

  return (
    <table className="w-fit border-collapse text-left">
      <thead>
        <tr className="h-6 text-label text-ink-muted">
          <th className="w-[72px] font-medium">Set</th>
          {isCardio ? (
            <th className="w-[132px] font-medium">Duration</th>
          ) : (
            <>
              <th className="w-[132px] font-medium">Weight</th>
              <th className="w-[112px] font-medium">Reps</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {exercise.sets.map((set) => (
          <tr key={set.id} className="h-8 tabular-nums">
            <td className="text-body-sm font-medium text-ink-muted">{set.setNumber}</td>
            {isCardio ? (
              <td className="text-body text-ink">{set.durationSeconds === null ? "—" : formatDuration(set.durationSeconds)}</td>
            ) : (
              <>
                <td className="text-body text-ink">{set.weight === null ? "—" : `${set.weight} lb`}</td>
                <td className="text-body text-ink">{set.reps ?? "—"}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// A finished workout log, read-only (Past workout log board): the workout as it is
// now, each exercise's sets from this log in the workout's current order; an exercise
// removed since keeps its sets, flagged and listed last; one added since reads "No
// sets logged".
export function PastLogView({ log }: { log: PastWorkoutLog }) {
  const minutes = sessionMinutes(log.startedAt, log.performedAt);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <BackLink href="/fitness/workouts">Workouts</BackLink>
        <PageHeader
          className="mb-0"
          title={log.workoutName ?? "Ad-hoc workout"}
          actions={
            log.workoutId && (
              <Link href={`/fitness/workouts/${log.workoutId}/edit`} className={buttonVariants({ variant: "outline" })}>
                <Pencil strokeWidth={1.75} />
                Edit workout
              </Link>
            )
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-1.5 text-body-sm font-medium text-ink">
          <CircleCheck className="size-3.5 text-teal-ink" strokeWidth={1.75} aria-hidden="true" />
          Finished {formatRelativeTime(log.performedAt)} · {formatShortDate(log.performedOn)}
        </span>
        <span className="text-body-sm text-ink-muted tabular-nums">{sessionSummary(minutes, log.setCount, " logged")}</span>
      </div>

      {log.notes && <p className="text-body text-ink-muted">{log.notes}</p>}

      {log.exercises.length === 0 ? (
        <p className="text-body text-ink-muted">No sets were logged for this workout.</p>
      ) : (
        log.exercises.map((exercise) => (
          <section
            key={exercise.workoutExerciseId ?? exercise.exerciseId}
            aria-label={exercise.exerciseName}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-100 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-heading text-ink">{exercise.exerciseName}</h2>
                <span className="text-caption text-ink-muted">
                  {exerciseSummary(exercise.exerciseType, exercise.muscleGroups)}
                </span>
              </div>
              {exercise.removedFromWorkout ? (
                <Tag>
                  <Archive strokeWidth={1.75} />
                  removed from workout
                </Tag>
              ) : (
                exercise.addedAfterSession && <Tag>Added after this session</Tag>
              )}
            </div>
            <ExerciseSets exercise={exercise} />
          </section>
        ))
      )}
    </div>
  );
}
