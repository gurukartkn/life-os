"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateExercise } from "@/actions/exercises";
import { createMuscleGroupInline } from "@/actions/muscle-groups";
import { createEquipmentInline } from "@/actions/equipment";
import { exerciseUpdateSchema, type ExerciseUpdateInput } from "@/lib/validations/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagPicker } from "@/components/fitness/tag-picker";
import type { ExerciseWithTags } from "@/lib/queries/fitness";
import type { CatalogItem } from "@/lib/fitness/catalog";

// A picker's own item list may be active-only, but an exercise that is already tagged
// with an archived (or otherwise unlisted) item still needs to show that tag as chosen.
function withCurrentTags(items: CatalogItem[], current: CatalogItem[]): CatalogItem[] {
  const known = new Set(items.map((item) => item.id));
  return [...items, ...current.filter((item) => !known.has(item.id))];
}

// The inline row an exercise expands into when its pencil is clicked — the same tag
// pickers as the add form, prefilled, replacing the row until saved or cancelled.
export function EditExerciseForm({
  exercise,
  muscleGroups,
  equipment,
  onDone,
}: {
  exercise: ExerciseWithTags;
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
  onDone: () => void;
}) {
  const muscleGroupOptions = withCurrentTags(muscleGroups, exercise.muscleGroups);
  const equipmentOptions = withCurrentTags(equipment, exercise.equipment);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ExerciseUpdateInput>({
    resolver: zodResolver(exerciseUpdateSchema),
    defaultValues: {
      id: exercise.id,
      name: exercise.name,
      exerciseType: exercise.exerciseType as ExerciseUpdateInput["exerciseType"],
      muscleGroupIds: exercise.muscleGroups.map((g) => g.id),
      equipmentIds: exercise.equipment.map((e) => e.id),
    },
  });

  function onSubmit(values: ExerciseUpdateInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateExercise(values);
      if (!result.success) {
        setServerError(result.error ?? "Couldn't update the exercise. Try again.");
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-3 rounded-md border border-accent bg-surface-100 p-4"
      noValidate
    >
      <div className="flex flex-wrap items-start gap-2">
        <Input aria-label="Exercise name" {...form.register("name")} />
        <select
          aria-label="Exercise type"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("exerciseType")}
        >
          <option value="weight_training">Weight training</option>
          <option value="cardio">Cardio</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-6">
        <Controller
          control={form.control}
          name="muscleGroupIds"
          render={({ field }) => (
            <TagPicker
              label="Muscle groups"
              items={muscleGroupOptions}
              selectedIds={field.value}
              onChange={field.onChange}
              onCreate={async (name) => {
                const result = await createMuscleGroupInline({ name });
                return result.success && result.data
                  ? { success: true, item: result.data }
                  : { success: false, error: result.error ?? "Couldn't add that." };
              }}
              addPlaceholder="New muscle group…"
            />
          )}
        />
        <Controller
          control={form.control}
          name="equipmentIds"
          render={({ field }) => (
            <TagPicker
              label="Equipment"
              items={equipmentOptions}
              selectedIds={field.value}
              onChange={field.onChange}
              onCreate={async (name) => {
                const result = await createEquipmentInline({ name });
                return result.success && result.data
                  ? { success: true, item: result.data }
                  : { success: false, error: result.error ?? "Couldn't add that." };
              }}
              addPlaceholder="New equipment…"
            />
          )}
        />
      </div>

      {(form.formState.errors.name?.message ?? serverError) && (
        <p className="text-caption text-pink-ink">{form.formState.errors.name?.message ?? serverError}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" tone="teal" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
