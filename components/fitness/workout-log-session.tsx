"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Timer } from "lucide-react";
import { finishWorkoutLog } from "@/actions/workout-logs";
import { WorkoutLogExercise } from "@/components/fitness/workout-log-exercise";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import type { SetData } from "@/components/fitness/set-row";

export type ExerciseCardData = {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  muscleGroups: string[];
  targetSets: number | null;
  targetReps: string | null;
  sets: SetData[];
};

// "24:18", or "1:02:05" past the hour.
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

// A clock that ticks once a second, read as whole seconds so a snapshot is stable
// within the second. The server snapshot is null, so the server render and hydration
// agree ("0:00") before the browser takes over.
function subscribeToClock(onTick: () => void) {
  const interval = window.setInterval(onTick, 1000);
  return () => window.clearInterval(interval);
}
const clockSeconds = () => Math.floor(Date.now() / 1000);
const noClock = () => null;

// Time since the session started, ticking each second.
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const seconds = useSyncExternalStore(subscribeToClock, clockSeconds, noClock);
  const now = seconds === null ? null : seconds * 1000;

  return (
    <span className="flex items-center gap-1.5" aria-label="Time elapsed">
      <Timer className="size-4 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
      <span className="text-body font-semibold text-ink tabular-nums">
        {formatElapsed(now === null ? 0 : now - new Date(startedAt).getTime())}
      </span>
    </span>
  );
}

// The live session (Log workout board): when it started, a running timer, and one
// card per exercise; Finish workout ends it and opens the finished log.
export function WorkoutLogSession({
  workoutLogId,
  workoutName,
  startedLabel,
  startedAt,
  exerciseCards,
  children,
}: {
  workoutLogId: string;
  workoutName: string;
  // "Started 6:42 pm", formatted in the user's timezone on the server.
  startedLabel: string;
  startedAt: string;
  exerciseCards: ExerciseCardData[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [isFinishing, startFinishing] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <BackLink href="/fitness/workouts">Workouts</BackLink>
        <PageHeader
          className="mb-0 flex-wrap"
          title={workoutName}
          description={startedLabel}
          actions={
            <div className="flex items-center gap-3">
              <ElapsedTimer startedAt={startedAt} />
              <Tag tone="blue">In progress</Tag>
              <Button type="button" onClick={handleFinish} disabled={isFinishing}>
                <Check strokeWidth={1.75} />
                {isFinishing ? "Finishing…" : "Finish workout"}
              </Button>
            </div>
          }
        />
        <FieldError>{finishError}</FieldError>
      </div>

      {children}

      {exerciseCards.length === 0 ? (
        <p className="text-body text-ink-muted">This workout has no exercises yet.</p>
      ) : (
        exerciseCards.map((card) => (
          <WorkoutLogExercise
            key={card.workoutExerciseId}
            workoutLogId={workoutLogId}
            exerciseId={card.exerciseId}
            exerciseName={card.exerciseName}
            exerciseType={card.exerciseType}
            muscleGroups={card.muscleGroups}
            targetSets={card.targetSets}
            targetReps={card.targetReps}
            initialSets={card.sets}
          />
        ))
      )}
    </div>
  );
}
