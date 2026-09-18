"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createExercise } from "@/actions/exercises";
import { exerciseInsertSchema, type ExerciseInsertInput } from "@/lib/validations/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = { success: false };

const DEFAULT_VALUES: ExerciseInsertInput = {
  name: "",
  exercise_type: "weight_training",
  muscle_groups: "",
  equipment: "",
};

export function AddExerciseForm() {
  const [state, formAction, isPending] = useActionState(createExercise, initialState);
  const form = useForm<ExerciseInsertInput>({
    resolver: zodResolver(exerciseInsertSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (state.success) form.reset(DEFAULT_VALUES);
  }, [state, form]);

  function onSubmit(values: ExerciseInsertInput) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("exercise_type", values.exercise_type);
    if (values.muscle_groups) formData.append("muscle_groups", values.muscle_groups);
    if (values.equipment) formData.append("equipment", values.equipment);
    startTransition(() => formAction(formData));
  }

  const fieldError =
    form.formState.errors.name?.message ??
    form.formState.errors.exercise_type?.message ??
    form.formState.errors.muscle_groups?.message ??
    form.formState.errors.equipment?.message ??
    state.error;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1.5" noValidate>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          aria-label="Exercise name"
          placeholder="Add an exercise…"
          {...form.register("name")}
        />
        <select
          aria-label="Exercise type"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("exercise_type")}
        >
          <option value="weight_training">Weight training</option>
          <option value="cardio">Cardio</option>
          <option value="other">Other</option>
        </select>
        <Input
          aria-label="Muscle groups"
          placeholder="Muscle groups (comma-separated)"
          className="w-52"
          {...form.register("muscle_groups")}
        />
        <Input
          aria-label="Equipment"
          placeholder="Equipment (comma-separated)"
          className="w-52"
          {...form.register("equipment")}
        />
        <Button type="submit" disabled={isPending}>
          <Plus />
          {isPending ? "Adding…" : "Add exercise"}
        </Button>
      </div>
      {fieldError && <p className="text-caption text-pink-ink">{fieldError}</p>}
    </form>
  );
}
