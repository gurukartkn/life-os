"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { deleteSetLog, saveSetLog } from "@/actions/workout-logs";

export type SetData = {
  id: string | null;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

const toText = (value: number | null) => (value === null ? "" : String(value));
const toNumber = (text: string) => (text.trim() === "" ? undefined : Number(text));

// An input with its unit inside the field ("60 lb", "8 reps"), per the Log board.
function UnitInput({
  label,
  unit,
  value,
  onChange,
  inputMode,
  className,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  inputMode: "decimal" | "numeric";
  className: string;
}) {
  return (
    <label
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface-100 px-2.5 transition-colors focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/30",
        className
      )}
    >
      <input
        aria-label={label}
        value={value}
        placeholder="0"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-amount text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
      />
      <span className="text-caption text-ink-muted">{unit}</span>
    </label>
  );
}

// One set of a live session (Log workout board). Cardio takes a duration in seconds;
// weight training and other take weight (lb) and reps. The set saves itself when focus
// leaves the row with something to save — there is no separate save button.
export function SetRow({
  workoutLogId,
  exerciseId,
  exerciseType,
  set,
  onSaved,
  onRemoved,
}: {
  workoutLogId: string;
  exerciseId: string;
  exerciseType: string;
  set: SetData;
  onSaved: (saved: SetData) => void;
  onRemoved: () => void;
}) {
  const isCardio = exerciseType === "cardio";
  const [weight, setWeight] = useState(toText(set.weight));
  const [reps, setReps] = useState(toText(set.reps));
  const [duration, setDuration] = useState(toText(set.durationSeconds));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowRef = useRef<HTMLDivElement>(null);

  const next: SetData = {
    id: set.id,
    setNumber: set.setNumber,
    weight: isCardio ? null : toNumber(weight) ?? null,
    reps: isCardio ? null : toNumber(reps) ?? null,
    durationSeconds: isCardio ? toNumber(duration) ?? null : null,
  };
  const dirty =
    next.weight !== set.weight || next.reps !== set.reps || next.durationSeconds !== set.durationSeconds;
  const saveable = isCardio ? next.durationSeconds !== null : next.reps !== null;

  function save() {
    if (!dirty || !saveable) return;
    if ([next.weight, next.reps, next.durationSeconds].some((value) => value !== null && Number.isNaN(value))) {
      setError("Enter numbers only.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveSetLog({
        workout_log_id: workoutLogId,
        exercise_id: exerciseId,
        set_number: set.setNumber,
        weight: next.weight ?? undefined,
        reps: next.reps ?? undefined,
        duration_seconds: next.durationSeconds ?? undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn't save the set. Try again.");
        return;
      }
      onSaved({ ...next, id: set.id ?? "saved" });
    });
  }

  function remove() {
    setError(null);
    if (!set.id) {
      onRemoved();
      return;
    }
    startTransition(async () => {
      const result = await deleteSetLog(set.id as string, workoutLogId);
      if (!result.success) {
        setError(result.error ?? "Couldn't remove the set. Try again.");
        return;
      }
      onRemoved();
    });
  }

  return (
    <div>
      <div
        ref={rowRef}
        data-slot="set-row"
        onBlur={(event) => {
          if (!rowRef.current?.contains(event.relatedTarget as Node | null)) save();
        }}
        className={cn("flex h-11 items-center gap-3", isPending && "opacity-60")}
      >
        <span className="w-11 text-body-sm font-medium text-ink-muted tabular-nums">{set.setNumber}</span>
        {isCardio ? (
          <UnitInput
            label={`Set ${set.setNumber} duration in seconds`}
            unit="sec"
            value={duration}
            onChange={setDuration}
            inputMode="numeric"
            className="w-[120px]"
          />
        ) : (
          <>
            <UnitInput
              label={`Set ${set.setNumber} weight`}
              unit="lb"
              value={weight}
              onChange={setWeight}
              inputMode="decimal"
              className="w-[120px]"
            />
            <UnitInput
              label={`Set ${set.setNumber} reps`}
              unit="reps"
              value={reps}
              onChange={setReps}
              inputMode="numeric"
              className="w-[110px]"
            />
          </>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove set ${set.setNumber}`}
          disabled={isPending}
          onClick={remove}
        >
          <X strokeWidth={1.75} />
        </Button>
      </div>
      {error && <p className="pb-1 pl-14 text-caption text-pink-ink">{error}</p>}
    </div>
  );
}
