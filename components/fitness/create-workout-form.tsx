"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createWorkout } from "@/actions/workouts";
import { createWorkoutSchema, type CreateWorkoutInput } from "@/lib/validations/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/types/database";

const EMPTY_EXERCISE = { exercise_id: "", target_sets: 3, target_reps: "" };

export function CreateWorkoutForm({ exercises }: { exercises: Tables<"exercises">[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues: { name: "", notes: "", exercises: [EMPTY_EXERCISE] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "exercises" });

  function onSubmit(values: CreateWorkoutInput) {
    startTransition(async () => {
      const result = await createWorkout(values);
      if (result && !result.success) {
        form.setError("root", {
          message: result.error ?? "Couldn't create the workout. Try again.",
        });
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workout-name">Name</Label>
        <Input id="workout-name" placeholder="Push Workout A" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-caption text-pink-ink">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workout-notes">Notes</Label>
        <Input id="workout-notes" placeholder="Optional" {...form.register("notes")} />
      </div>

      {exercises.length === 0 && (
        <p className="text-caption text-ink-faint">
          Add an exercise on the Exercises tab first, then come back to build a workout.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Label>Exercises</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <select
              aria-label={`Exercise ${index + 1}`}
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register(`exercises.${index}.exercise_id` as const)}
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
              {...form.register(`exercises.${index}.target_sets` as const, {
                valueAsNumber: true,
              })}
            />
            <Input
              aria-label={`Exercise ${index + 1} target reps`}
              placeholder="8-12"
              className="w-24"
              {...form.register(`exercises.${index}.target_reps` as const)}
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
        ))}
        <button
          type="button"
          onClick={() => append(EMPTY_EXERCISE)}
          className="text-button-text flex w-fit items-center gap-1.5 text-accent-text"
        >
          <Plus className="size-4" />
          Add exercise
        </button>
        {form.formState.errors.exercises?.message && (
          <p className="text-caption text-pink-ink">{form.formState.errors.exercises.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-caption text-pink-ink">{form.formState.errors.root.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" tone="teal" disabled={isPending}>
          {isPending ? "Creating…" : "Create workout"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/fitness")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
