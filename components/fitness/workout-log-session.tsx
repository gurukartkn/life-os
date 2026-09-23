"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WorkoutLogExercise } from "@/components/fitness/workout-log-exercise";
import { finishWorkoutLog } from "@/actions/workout-logs";
import type { SetData } from "@/components/fitness/set-row";

export type ExerciseCardData = {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  muscleGroups: string[];
  targetSets: number | null;
  sets: SetData[];
  savedCount: number;
};

function isExerciseComplete(targetSets: number | null, savedCount: number): boolean {
  return targetSets !== null && savedCount >= targetSets && savedCount > 0;
}

export function WorkoutLogSession({
  workoutLogId,
  workoutName,
  exerciseCards,
  children,
}: {
  workoutLogId: string;
  workoutName: string;
  exerciseCards: ExerciseCardData[];
  children?: React.ReactNode;
}) {
  const [completion, setCompletion] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      exerciseCards.map((card) => [
        card.workoutExerciseId,
        isExerciseComplete(card.targetSets, card.savedCount),
      ])
    )
  );
  const router = useRouter();
  const [isFinishing, startFinishing] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);

  const totalCount = exerciseCards.length;
  const doneCount = Object.values(completion).filter(Boolean).length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function handleFinish() {
    setFinishError(null);
    startFinishing(async () => {
      const result = await finishWorkoutLog(workoutLogId);
      if (!result.success) {
        setFinishError(result.error ?? "Couldn't finish the workout. Try again.");
        return;
      }
      router.push(`/fitness/logs/${workoutLogId}`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-caption text-ink-faint">Logging workout</span>
          <h1 className="text-page-title text-ink">{workoutName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-body-sm text-ink-faint">
              {doneCount} of {totalCount} exercise{totalCount === 1 ? "" : "s"} done
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-200">
              <div
                className="h-full bg-teal transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <Button type="button" tone="teal" onClick={handleFinish} disabled={isFinishing}>
            {isFinishing ? "Finishing…" : "Finish workout"}
          </Button>
        </div>
      </div>
      {finishError && <p className="text-caption text-pink-ink">{finishError}</p>}

      {children}

      {exerciseCards.length === 0 ? (
        <p className="text-body text-ink-muted">This workout has no exercises yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {exerciseCards.map((card) => (
            <WorkoutLogExercise
              key={card.workoutExerciseId}
              workoutLogId={workoutLogId}
              exerciseId={card.exerciseId}
              exerciseName={card.exerciseName}
              exerciseType={card.exerciseType}
              muscleGroups={card.muscleGroups}
              targetSets={card.targetSets}
              initialSets={card.sets}
              onCompleteChange={(isComplete) =>
                setCompletion((prev) =>
                  prev[card.workoutExerciseId] === isComplete
                    ? prev
                    : { ...prev, [card.workoutExerciseId]: isComplete }
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
