"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { updateWorkout } from "@/actions/workouts";
import { workoutUpdateSchema, type WorkoutUpdateInput } from "@/lib/validations/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditableExercise = { id: string; name: string };

const EMPTY_ITEM = { exerciseId: "", targetSets: 3, targetReps: "" };

// The workout editor (v2 Stage 3): name, notes, and an ordered list of exercises that
// can be added, removed and reordered. Existing rows keep their id (a hidden field) so
// updateWorkout can upsert them in place rather than recreating the workout.
export function WorkoutEditForm({
  workout,
  exercises,
}: {
  workout: WorkoutUpdateInput;
  exercises: EditableExercise[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<WorkoutUpdateInput>({
    resolver: zodResolver(workoutUpdateSchema),
    defaultValues: workout,
  });
  // A custom keyName, because our own row data already has an `id` property (the
  // existing workout_exercises row to keep) — without this, useFieldArray would
  // shadow it with its own generated key and the real id would never reach submit.
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "fieldKey",
  });

  function onSubmit(values: WorkoutUpdateInput) {
    startTransition(async () => {
      const result = await updateWorkout(values);
      if (!result.success) {
        form.setError("root", { message: result.error ?? "Couldn't update the workout. Try again." });
        return;
      }
      router.push("/fitness");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <input type="hidden" {...form.register("id")} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workout-name">Name</Label>
        <Input id="workout-name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-caption text-pink-ink">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workout-notes">Notes</Label>
        <Input id="workout-notes" placeholder="Optional" {...form.register("notes")} />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Exercises</Label>
        {fields.map((field, index) => (
          <div key={field.fieldKey} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <div className="flex h-8 flex-col justify-center">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move exercise ${index + 1} up`}
                  className="text-ink-faint transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === fields.length - 1}
                  aria-label={`Move exercise ${index + 1} down`}
                  className="text-ink-faint transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              {/* No hidden input for the row id: it isn't user-editable, and RHF carries it
                  through from defaultValues/append/move without needing a registered field —
                  see the keyName note above for why it must not collide with useFieldArray's own key. */}
              <select
                aria-label={`Exercise ${index + 1}`}
                className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...form.register(`items.${index}.exerciseId` as const)}
              >
                <option value="">Choose an exercise…</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <Input
                aria-label={`Exercise ${index + 1} target sets`}
                type="number"
                min={1}
                max={20}
                className="w-20"
                {...form.register(`items.${index}.targetSets` as const, { valueAsNumber: true })}
              />
              <Input
                aria-label={`Exercise ${index + 1} target reps`}
                placeholder="8-12"
                className="w-24"
                {...form.register(`items.${index}.targetReps` as const)}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label="Remove exercise"
                className="flex h-8 items-center text-ink-faint transition-colors hover:text-pink-ink disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {form.formState.errors.items?.[index]?.exerciseId && (
              <p className="pl-7 text-caption text-pink-ink">
                {form.formState.errors.items[index]?.exerciseId?.message}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => append(EMPTY_ITEM)}
          className="text-button-text flex w-fit items-center gap-1.5 text-accent-text"
        >
          <Plus className="size-4" />
          Add exercise
        </button>
        {form.formState.errors.items?.message && (
          <p className="text-caption text-pink-ink">{form.formState.errors.items.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-caption text-pink-ink">{form.formState.errors.root.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" tone="teal" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/fitness")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
