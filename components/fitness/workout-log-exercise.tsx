"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetRow, type SetData } from "@/components/fitness/set-row";
import { exerciseSummary } from "@/lib/fitness/labels";

function targetText(targetSets: number | null, targetReps: string | null): string | null {
  if (targetSets === null) return null;
  return targetReps ? `Target ${targetSets} × ${targetReps}` : `Target ${targetSets} ${targetSets === 1 ? "set" : "sets"}`;
}

// One exercise of a live session: its name, type and muscle groups, the target, and
// its sets — added and removed inline.
export function WorkoutLogExercise({
  workoutLogId,
  exerciseId,
  exerciseName,
  exerciseType,
  muscleGroups,
  targetSets,
  targetReps,
  initialSets,
}: {
  workoutLogId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  muscleGroups: string[];
  targetSets: number | null;
  targetReps: string | null;
  initialSets: SetData[];
}) {
  const [sets, setSets] = useState<SetData[]>(initialSets);
  const isCardio = exerciseType === "cardio";
  const target = targetText(targetSets, targetReps);

  function handleAddSet() {
    const nextNumber = sets.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1;
    setSets((prev) => [...prev, { id: null, setNumber: nextNumber, weight: null, reps: null, durationSeconds: null }]);
  }

  return (
    <section
      aria-label={exerciseName}
      className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-100 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-heading text-ink">{exerciseName}</h2>
          <span className="text-caption text-ink-muted">{exerciseSummary(exerciseType, muscleGroups)}</span>
        </div>
        {target && <span className="shrink-0 text-body-sm text-ink-muted tabular-nums">{target}</span>}
      </div>
      <div className="flex h-6 items-center gap-3 text-label text-ink-muted" aria-hidden="true">
        <span className="w-11">Set</span>
        {isCardio ? (
          <span className="w-[120px]">Duration</span>
        ) : (
          <>
            <span className="w-[120px]">Weight</span>
            <span className="w-[110px]">Reps</span>
          </>
        )}
      </div>
      {sets.map((set) => (
        <SetRow
          key={set.setNumber}
          workoutLogId={workoutLogId}
          exerciseId={exerciseId}
          exerciseType={exerciseType}
          set={set}
          onSaved={(saved) => setSets((prev) => prev.map((s) => (s.setNumber === set.setNumber ? saved : s)))}
          onRemoved={() => setSets((prev) => prev.filter((s) => s.setNumber !== set.setNumber))}
        />
      ))}
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={handleAddSet}>
        <Plus strokeWidth={1.75} />
        Add set
      </Button>
    </section>
  );
}
