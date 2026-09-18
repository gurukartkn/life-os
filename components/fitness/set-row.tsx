"use client";

import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "cn";
import { deleteSetLog, saveSetLog } from "@/actions/workout-logs";

export type SetData = {
  id: string | null;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

export function SetRow({
  workoutLogId,
  exerciseId,
  exerciseType,
  set,
  onSaved,
  onDeleted,
}: {
  workoutLogId: string;
  exerciseId: string;
  exerciseType: string;
  set: SetData;
  onSaved: (saved: SetData) => void;
  onDeleted: () => void;
}) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? "");
  const [reps, setReps] = useState(set.reps?.toString() ?? "");
  const [duration, setDuration] = useState(set.durationSeconds?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCardio = exerciseType === "cardio";

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveSetLog({
        workout_log_id: workoutLogId,
        exercise_id: exerciseId,
        set_number: set.setNumber,
        weight: isCardio ? undefined : weight ? Number(weight) : undefined,
        reps: isCardio ? undefined : reps ? Number(reps) : undefined,
        duration_seconds: isCardio ? (duration ? Number(duration) : undefined) : undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn't save the set. Try again.");
        return;
      }
      onSaved({
        id: set.id ?? "saved",
        setNumber: set.setNumber,
        weight: isCardio ? null : weight ? Number(weight) : null,
        reps: isCardio ? null : reps ? Number(reps) : null,
        durationSeconds: isCardio ? (duration ? Number(duration) : null) : null,
      });
    });
  }

  function handleDelete() {
    if (!set.id) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSetLog(set.id as string, workoutLogId);
      if (!result.success) {
        setError(result.error ?? "Couldn't delete the set. Try again.");
        return;
      }
      onDeleted();
    });
  }

  return (
    <div className="flex items-center gap-3.5">
      <span className="w-11 text-body-sm text-ink-faint">Set {set.setNumber}</span>
      {isCardio ? (
        <input
          aria-label={`Set ${set.setNumber} duration in seconds`}
          className="w-24 rounded-lg border border-input bg-transparent px-2 py-1 text-center text-body-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Seconds"
          inputMode="numeric"
        />
      ) : (
        <>
          <input
            aria-label={`Set ${set.setNumber} weight`}
            className="w-[68px] rounded-lg border border-input bg-transparent px-2 py-1 text-center text-body-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="lb"
            inputMode="decimal"
          />
          <span className="text-caption text-ink-faint">×</span>
          <input
            aria-label={`Set ${set.setNumber} reps`}
            className="w-[68px] rounded-lg border border-input bg-transparent px-2 py-1 text-center text-body-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="reps"
            inputMode="numeric"
          />
        </>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        aria-label={`Save set ${set.setNumber}`}
        className={cn(
          "flex size-6 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
          set.id
            ? "border-teal bg-teal text-white"
            : "border-border-strong text-ink-faint hover:border-teal hover:text-teal-ink"
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </button>
      {set.id && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete set ${set.setNumber}`}
          className="rounded-sm text-ink-faint outline-none transition-colors hover:text-pink-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
