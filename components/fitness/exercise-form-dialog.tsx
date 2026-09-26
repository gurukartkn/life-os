"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { archiveExercise, createExerciseWithTags, updateExercise } from "@/actions/exercises";
import { createEquipmentInline } from "@/actions/equipment";
import { createMuscleGroupInline } from "@/actions/muscle-groups";
import { exerciseCreateSchema, type ExerciseCreateInput } from "@/lib/validations/fitness";
import { EXERCISE_TYPE_LABELS, EXERCISE_TYPES, type ExerciseType } from "@/lib/fitness/labels";
import { TagCombobox, type TagCreateResult } from "@/components/fitness/tag-combobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { CatalogItem, CatalogResult } from "@/lib/fitness/catalog";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

const TYPE_OPTIONS = EXERCISE_TYPES.map((value) => ({ value, label: EXERCISE_TYPE_LABELS[value] }));

// A picker lists active items only, but an exercise already tagged with an archived
// item must still show that tag as chosen.
function withCurrentTags(items: CatalogItem[], current: CatalogItem[]): CatalogItem[] {
  const known = new Set(items.map((item) => item.id));
  return [...items, ...current.filter((item) => !known.has(item.id))];
}

function toCreateResult(result: CatalogResult<CatalogItem>): TagCreateResult {
  return result.success && result.data
    ? { success: true, item: result.data }
    : { success: false, error: result.error ?? "Couldn't add that. Try again." };
}

export type SavedExercise = { id: string; name: string; exerciseType: string; muscleGroupNames: string[] };

function ExerciseForm({
  exercise,
  muscleGroups,
  equipment,
  onSaved,
}: {
  exercise: ExerciseWithTags | null;
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
  onSaved: (saved: SavedExercise | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Items created inline are remembered here too, so the saved exercise can report
  // its muscle group names to a caller (the workout editor).
  const [createdGroups, setCreatedGroups] = useState<CatalogItem[]>([]);
  const muscleGroupOptions = withCurrentTags(muscleGroups, exercise?.muscleGroups ?? []);
  const equipmentOptions = withCurrentTags(equipment, exercise?.equipment ?? []);
  const form = useForm<ExerciseCreateInput>({
    resolver: zodResolver(exerciseCreateSchema),
    defaultValues: {
      name: exercise?.name ?? "",
      exerciseType: (exercise?.exerciseType as ExerciseType | undefined) ?? "weight_training",
      muscleGroupIds: exercise?.muscleGroups.map((group) => group.id) ?? [],
      equipmentIds: exercise?.equipment.map((item) => item.id) ?? [],
    },
  });

  function onSubmit(values: ExerciseCreateInput) {
    setServerError(null);
    startTransition(async () => {
      const result = exercise
        ? await updateExercise({ ...values, id: exercise.id })
        : await createExerciseWithTags(values);
      if (!result.success) {
        setServerError(result.error ?? "Couldn't save the exercise. Try again.");
        return;
      }
      const names = new Map([...muscleGroupOptions, ...createdGroups].map((group) => [group.id, group.name]));
      const savedId = exercise?.id ?? (result.data as { id: string } | undefined)?.id;
      onSaved(
        savedId
          ? {
              id: savedId,
              name: values.name.trim(),
              exerciseType: values.exerciseType,
              muscleGroupNames: values.muscleGroupIds.flatMap((groupId) => names.get(groupId) ?? []),
            }
          : null
      );
    });
  }

  function handleArchive() {
    if (!exercise) return;
    setServerError(null);
    startTransition(async () => {
      const result = await archiveExercise(exercise.id);
      if (!result.success) {
        setServerError(result.error ?? "Couldn't archive the exercise. Try again.");
        return;
      }
      onSaved(null);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DialogHeader
        title={exercise ? "Edit exercise" : "New exercise"}
        description="Pick existing muscle groups and equipment, or create one without leaving this form."
      />
      <div className="flex flex-col gap-4">
        <Field>
          <Label htmlFor="exercise-name">Name</Label>
          <Input
            id="exercise-name"
            autoFocus
            aria-invalid={form.formState.errors.name ? true : undefined}
            {...form.register("name")}
          />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
        <Field>
          <span className="text-label text-ink">Type</span>
          <Controller
            control={form.control}
            name="exerciseType"
            render={({ field }) => (
              <SegmentedControl label="Type" value={field.value} options={TYPE_OPTIONS} onChange={field.onChange} />
            )}
          />
        </Field>
        <Controller
          control={form.control}
          name="muscleGroupIds"
          render={({ field }) => (
            <TagCombobox
              label="Muscle groups"
              items={muscleGroupOptions}
              selectedIds={field.value}
              onChange={field.onChange}
              onCreate={async (name) => {
                const result = toCreateResult(await createMuscleGroupInline({ name }));
                if (result.success) setCreatedGroups((prev) => [...prev, result.item]);
                return result;
              }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="equipmentIds"
          render={({ field }) => (
            <TagCombobox
              label="Equipment"
              items={equipmentOptions}
              selectedIds={field.value}
              onChange={field.onChange}
              onCreate={async (name) => toCreateResult(await createEquipmentInline({ name }))}
              placeholder="Search or create equipment"
            />
          )}
        />
        <FieldError>{serverError}</FieldError>
      </div>
      <DialogFooter className={exercise?.isActive ? "justify-between" : undefined}>
        {exercise?.isActive && (
          <Button type="button" variant="ghost" disabled={isPending} onClick={handleArchive}>
            Archive exercise
          </Button>
        )}
        <div className="flex items-center gap-2">
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save exercise"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

// New / edit exercise modal (560px). `onSaved` hears about a created or updated
// exercise — the workout editor adds a new one straight into the workout.
export function ExerciseFormDialog({
  open,
  exercise,
  muscleGroups,
  equipment,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  exercise: ExerciseWithTags | null;
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
  onOpenChange: (open: boolean) => void;
  onSaved?: (saved: SavedExercise) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        {open && (
          <ExerciseForm
            key={exercise?.id ?? "new"}
            exercise={exercise}
            muscleGroups={muscleGroups}
            equipment={equipment}
            onSaved={(saved) => {
              if (saved) onSaved?.(saved);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
