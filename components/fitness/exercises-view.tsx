"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Inbox, Pencil, Plus, Search } from "lucide-react";
import { ExerciseFormDialog } from "@/components/fitness/exercise-form-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tag } from "@/components/ui/tag";
import { EXERCISE_TYPE_LABELS, EXERCISE_TYPES, exerciseTypeLabel } from "@/lib/fitness/labels";
import type { CatalogItem } from "@/lib/fitness/catalog";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

type TypeFilter = "all" | (typeof EXERCISE_TYPES)[number];

const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...EXERCISE_TYPES.map((value) => ({ value, label: EXERCISE_TYPE_LABELS[value] })),
];

function parseType(value: string | null): TypeFilter {
  return (EXERCISE_TYPES as readonly string[]).includes(value ?? "") ? (value as TypeFilter) : "all";
}

// Filters are URL state (docs/04 §5), but the page already holds every exercise, so a
// change only rewrites the URL in place — Next syncs useSearchParams from it — and the
// table filters in memory.
function writeParams(q: string, type: TypeFilter) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `/fitness/exercises?${query}` : "/fitness/exercises");
}

// Exercises board: header with New exercise, search + type filter, and a table of
// name, type, muscle group and equipment pills, each row editable in the modal.
export function ExercisesView({
  exercises,
  muscleGroups,
  equipment,
  loadError = false,
}: {
  exercises: ExerciseWithTags[];
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
  loadError?: boolean;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const type = parseType(searchParams.get("type"));
  const [dialog, setDialog] = useState<{ open: boolean; exercise: ExerciseWithTags | null }>({
    open: false,
    exercise: null,
  });
  const openNew = useCallback(() => setDialog({ open: true, exercise: null }), []);
  const setOpen = useCallback((open: boolean) => setDialog((current) => ({ ...current, open })), []);

  const needle = query.trim().toLowerCase();
  const visible = exercises.filter(
    (exercise) =>
      (type === "all" || exercise.exerciseType === type) &&
      (!needle || exercise.name.toLowerCase().includes(needle))
  );

  const newButton = (
    <Button type="button" onClick={openNew}>
      <Plus strokeWidth={1.75} />
      New exercise
    </Button>
  );

  let content: React.ReactNode;
  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={AlertCircle}
        title="Couldn’t load exercises"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (exercises.length === 0) {
    content = (
      <EmptyState
        icon={Inbox}
        title="No exercises yet"
        description="Add an exercise to build workouts from."
        action={newButton}
      />
    );
  } else {
    content = (
      <>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-full items-center gap-2 rounded-md border border-border-strong bg-surface-100 px-3 transition-colors focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/30 sm:w-[280px]">
            <Search className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
            <input
              type="search"
              aria-label="Search exercises"
              placeholder="Search exercises"
              defaultValue={query}
              onChange={(event) => writeParams(event.target.value, type)}
              className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint md:text-sm"
            />
          </div>
          <SegmentedControl
            label="Exercise type"
            value={type}
            options={FILTER_OPTIONS}
            onChange={(next) => writeParams(query, next)}
          />
        </div>
        <div role="table" aria-label="Exercises" className="overflow-hidden rounded-lg border border-border bg-surface-100">
          <div
            role="row"
            className="hidden h-9 items-center gap-3 bg-surface-200 pr-3 pl-4 text-label text-ink-muted md:flex"
          >
            <span role="columnheader" className="flex-[1.2]">Name</span>
            <span role="columnheader" className="w-[130px]">Type</span>
            <span role="columnheader" className="flex-1">Muscle groups</span>
            <span role="columnheader" className="flex-1">Equipment</span>
            <span className="w-8" />
          </div>
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-body text-ink-muted">No exercises match.</p>
          ) : (
            visible.map((exercise) => (
              <div
                key={exercise.id}
                role="row"
                className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border py-2 pr-3 pl-4 md:flex-nowrap"
              >
                <span role="cell" className="flex min-w-0 flex-[1.2] items-center gap-2">
                  <span className={`truncate text-body font-medium ${exercise.isActive ? "text-ink" : "text-ink-muted"}`}>
                    {exercise.name}
                  </span>
                  {!exercise.isActive && <Tag>Archived</Tag>}
                </span>
                <span role="cell" className="w-[130px]">
                  <Tag>{exerciseTypeLabel(exercise.exerciseType)}</Tag>
                </span>
                <span role="cell" className="flex flex-1 flex-wrap gap-1">
                  {exercise.muscleGroups.map((group) => (
                    <Tag key={group.id}>{group.name}</Tag>
                  ))}
                </span>
                <span role="cell" className="flex flex-1 flex-wrap gap-1">
                  {exercise.equipment.map((item) => (
                    <Tag key={item.id}>{item.name}</Tag>
                  ))}
                </span>
                <span role="cell" className="w-8">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${exercise.name}`}
                    onClick={() => setDialog({ open: true, exercise })}
                  >
                    <Pencil strokeWidth={1.75} />
                  </Button>
                </span>
              </div>
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Exercises" actions={newButton} />
      <div className="flex flex-col gap-4">{content}</div>
      <ExerciseFormDialog
        open={dialog.open}
        exercise={dialog.exercise}
        muscleGroups={muscleGroups}
        equipment={equipment}
        onOpenChange={setOpen}
      />
    </div>
  );
}
