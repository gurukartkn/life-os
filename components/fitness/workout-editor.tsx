"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { createWorkout, deleteWorkout, updateWorkout } from "@/actions/workouts";
import { ExerciseFormDialog, type SavedExercise } from "@/components/fitness/exercise-form-dialog";
import { BackLink } from "@/components/ui/back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionHeader } from "@/components/ui/section-header";
import { exerciseSummary, exerciseTypeLabel, plural } from "@/lib/fitness/labels";
import type { CatalogItem } from "@/lib/fitness/catalog";
import type { PickerExercise } from "@/lib/fitness/editor-data";
import { cn } from "@/lib/utils";



export type EditorItem = {
  // A stable key for React and drag-and-drop; `id` is the existing workout_exercises row, if any.
  key: string;
  id?: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
};

let keySeed = 0;
const nextKey = () => `new-${++keySeed}`;

// The workout editor (Workouts "Workout edit" board): the name, then an ordered table of
// exercises with target sets × reps — reorder by dragging the grip or with the arrows,
// remove, and add from a searchable picker whose "New exercise…" opens the exercise
// modal and adds the result straight in. The same screen creates a new workout.
export function WorkoutEditor({
  workout,
  initialItems,
  exercises: initialExercises,
  muscleGroups,
  equipment,
}: {
  workout: { id: string; name: string; notes: string | null } | null;
  initialItems: EditorItem[];
  exercises: PickerExercise[];
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(workout?.name ?? "");
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [exercises, setExercises] = useState(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newExerciseOpen, setNewExerciseOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; items?: string; root?: string }>({});
  const dragIndex = useRef<number | null>(null);

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const added = new Set(items.map((item) => item.exerciseId));
  const needle = search.trim().toLowerCase();
  const pickable = exercises
    .filter((exercise) => exercise.isActive || added.has(exercise.id))
    .filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));

  function update(key: string, patch: Partial<EditorItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addExercise(exerciseId: string) {
    setItems((prev) => [...prev, { key: nextKey(), exerciseId, targetSets: "3", targetReps: "" }]);
    setErrors((prev) => ({ ...prev, items: undefined }));
  }

  function handleNewExercise(saved: SavedExercise) {
    setExercises((prev) => [
      ...prev,
      { id: saved.id, name: saved.name, exerciseType: saved.exerciseType, muscleGroups: saved.muscleGroupNames, isActive: true },
    ]);
    addExercise(saved.id);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a name.";
    if (items.length === 0) next.items = "Add at least one exercise.";
    else if (items.some((item) => !/^\d+$/.test(item.targetSets) || Number(item.targetSets) < 1 || Number(item.targetSets) > 20))
      next.items = "Target sets must be a whole number from 1 to 20.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    startTransition(async () => {
      if (workout) {
        const result = await updateWorkout({
          id: workout.id,
          name: name.trim(),
          notes: workout.notes ?? undefined,
          items: items.map((item) => ({
            id: item.id,
            exerciseId: item.exerciseId,
            targetSets: Number(item.targetSets),
            targetReps: item.targetReps.trim() || undefined,
          })),
        });
        if (!result.success) {
          setErrors({ root: result.error ?? "Couldn't save the workout. Try again." });
          return;
        }
        router.push("/fitness/workouts");
        return;
      }
      // createWorkout redirects on success, so only a failure comes back.
      const result = await createWorkout({
        name: name.trim(),
        notes: "",
        exercises: items.map((item) => ({
          exercise_id: item.exerciseId,
          target_sets: Number(item.targetSets),
          target_reps: item.targetReps.trim() || undefined,
        })),
      });
      if (result && !result.success) setErrors({ root: result.error ?? "Couldn't create the workout. Try again." });
    });
  }

  function handleDelete() {
    if (!workout) return;
    startTransition(async () => {
      const result = await deleteWorkout(workout.id);
      if (!result.success) {
        setErrors({ root: result.error ?? "Couldn't delete the workout. Try again." });
        return;
      }
      router.push("/fitness/workouts");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <BackLink href="/fitness/workouts">Workouts</BackLink>
        <PageHeader
          className="mb-0"
          title={workout ? "Edit workout" : "New workout"}
          description={
            workout ? "Rename it, then add, remove and reorder exercises." : "Name it, then add and order its exercises."
          }
        />
      </div>

      <Field className="max-w-[360px]">
        <Label htmlFor="workout-name">Workout name</Label>
        <Input
          id="workout-name"
          value={name}
          placeholder="Upper body A"
          aria-invalid={errors.name ? true : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <FieldError>{errors.name}</FieldError>
      </Field>

      <SectionHeader title="Exercises">
        <span className="text-body-sm text-ink-muted">{plural(items.length, "exercise")}</span>
      </SectionHeader>

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
          <div className="hidden h-8 items-center gap-2 bg-surface-200 px-3 text-label text-ink-muted md:flex">
            <span className="w-11" />
            <span className="flex-1">Exercise</span>
            <span className="w-16">Sets</span>
            <span className="w-3" />
            <span className="w-16">Reps</span>
            <span className="w-[104px]" />
          </div>
          {items.map((item, index) => {
            const exercise = byId.get(item.exerciseId);
            const label = exercise?.name ?? "Exercise";
            return (
              <div
                key={item.key}
                data-slot="workout-editor-row"
                draggable
                onDragStart={() => (dragIndex.current = index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current !== null) move(dragIndex.current, index);
                  dragIndex.current = null;
                }}
                className="flex min-h-16 flex-wrap items-center gap-2 border-t border-border px-3 py-2 first:border-t-0 md:flex-nowrap md:first:border-t"
              >
                <GripVertical className="size-[18px] shrink-0 cursor-grab text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
                <span className="w-[18px] text-body-sm font-medium text-ink-muted tabular-nums">{index + 1}</span>
                <div className="flex min-w-40 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-medium text-ink">{label}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {exercise ? exerciseSummary(exercise.exerciseType, exercise.muscleGroups) : ""}
                  </span>
                </div>
                <input
                  aria-label={`Target sets for ${label}`}
                  inputMode="numeric"
                  value={item.targetSets}
                  onChange={(event) => update(item.key, { targetSets: event.target.value })}
                  className="h-9 w-16 rounded-md border border-border-strong bg-surface-100 text-center text-amount text-ink outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30"
                />
                <span className="w-3 text-center text-body text-ink-muted">×</span>
                <input
                  aria-label={`Target reps for ${label}`}
                  value={item.targetReps}
                  placeholder="—"
                  onChange={(event) => update(item.key, { targetReps: event.target.value })}
                  className="h-9 w-16 rounded-md border border-border-strong bg-surface-100 text-center text-amount text-ink outline-none placeholder:text-ink-faint focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30"
                />
                <div className="flex w-[104px] items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${label} up`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${label} down`}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${label}`}
                    onClick={() => setItems((prev) => prev.filter((row) => row.key !== item.key))}
                  >
                    <Trash2 strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <FieldError>{errors.items}</FieldError>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" className="w-fit" />}>
          <Plus strokeWidth={1.75} />
          Add exercise
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[340px] gap-2">
          <div className="flex h-10 items-center gap-2 rounded-md border border-border-strong bg-surface-100 px-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/30">
            <Search className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
            <input
              type="search"
              aria-label="Search exercises"
              placeholder="Search exercises"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint md:text-sm"
            />
          </div>
          <div className="flex max-h-64 flex-col overflow-y-auto">
            {pickable.length === 0 && <p className="px-2.5 py-2 text-body-sm text-ink-muted">No exercises match.</p>}
            {pickable.map((exercise) => {
              const isAdded = added.has(exercise.id);
              return (
                <label
                  key={exercise.id}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-sm px-2.5",
                    isAdded ? "cursor-default" : "cursor-pointer hover:bg-surface-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isAdded}
                    disabled={isAdded}
                    onChange={() => addExercise(exercise.id)}
                    className="size-[18px] accent-accent"
                  />
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{exercise.name}</span>
                  <span className="text-caption text-ink-muted">
                    {isAdded ? "Already added" : exerciseTypeLabel(exercise.exerciseType)}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setPickerOpen(false);
              setNewExerciseOpen(true);
            }}
            className="flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-left text-body font-semibold text-ink outline-none hover:bg-surface-200 focus-visible:bg-surface-200"
          >
            <Plus className="size-4" strokeWidth={1.75} />
            New exercise…
          </button>
        </PopoverContent>
      </Popover>

      <FieldError>{errors.root}</FieldError>
      <div className={cn("flex items-center gap-2", workout ? "justify-between" : "justify-end")}>
        {workout && (
          <Button type="button" variant="ghost" className="text-pink-ink hover:text-pink-ink" disabled={isPending} onClick={handleDelete}>
            Delete workout
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Link href="/fitness/workouts" className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : "Save workout"}
          </Button>
        </div>
      </div>

      <ExerciseFormDialog
        open={newExerciseOpen}
        exercise={null}
        muscleGroups={muscleGroups}
        equipment={equipment}
        onOpenChange={setNewExerciseOpen}
        onSaved={handleNewExercise}
      />
    </div>
  );
}
