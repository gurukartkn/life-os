"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { SetRow, type SetData } from "@/components/fitness/set-row";
import { EXERCISE_TYPE_LABELS } from "@/components/fitness/exercise-list";

export function WorkoutLogExercise({
  workoutLogId,
  exerciseId,
  exerciseName,
  exerciseType,
  muscleGroups,
  targetSets,
  initialSets,
  onCompleteChange,
}: {
  workoutLogId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  muscleGroups: string[];
  targetSets: number | null;
  initialSets: SetData[];
  onCompleteChange?: (isComplete: boolean) => void;
}) {
  const [sets, setSets] = useState<SetData[]>(initialSets);

  const savedCount = sets.filter((s) => s.id !== null).length;
  const isComplete = targetSets !== null && savedCount >= targetSets && savedCount > 0;

  const onCompleteChangeRef = useRef(onCompleteChange);
  useEffect(() => {
    onCompleteChangeRef.current = onCompleteChange;
  }, [onCompleteChange]);
  useEffect(() => {
    onCompleteChangeRef.current?.(isComplete);
  }, [isComplete]);

  function handleSaved(setNumber: number, saved: SetData) {
    setSets((prev) => prev.map((s) => (s.setNumber === setNumber ? saved : s)));
  }

  function handleDeleted(setNumber: number) {
    setSets((prev) =>
      prev.map((s) =>
        s.setNumber === setNumber
          ? { id: null, setNumber, weight: null, reps: null, durationSeconds: null }
          : s
      )
    );
  }

  function handleAddSet() {
    const nextNumber = (sets.at(-1)?.setNumber ?? 0) + 1;
    setSets((prev) => [
      ...prev,
      { id: null, setNumber: nextNumber, weight: null, reps: null, durationSeconds: null },
    ]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-100 p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
            isComplete ? "border-teal bg-teal" : "border-border-strong bg-surface-100"
          }`}
        >
          {isComplete && <Check className="size-3 text-white" strokeWidth={3} />}
        </span>
        <span className="text-heading text-ink">{exerciseName}</span>
        <Tag>{EXERCISE_TYPE_LABELS[exerciseType] ?? exerciseType}</Tag>
        {muscleGroups.slice(0, 2).map((group) => (
          <Tag key={group}>{group}</Tag>
        ))}
      </div>

      <div className="flex flex-col gap-2 pl-[28px]">
        {sets.map((set) => (
          <SetRow
            key={set.setNumber}
            workoutLogId={workoutLogId}
            exerciseId={exerciseId}
            exerciseType={exerciseType}
            set={set}
            onSaved={(saved) => handleSaved(set.setNumber, saved)}
            onDeleted={() => handleDeleted(set.setNumber)}
          />
        ))}
        <button
          type="button"
          onClick={handleAddSet}
          className="w-fit pt-1 text-body-sm font-medium text-teal-ink"
        >
          + Add set
        </button>
      </div>
    </div>
  );
}
