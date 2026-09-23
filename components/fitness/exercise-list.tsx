"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { ExerciseArchiveButton } from "@/components/fitness/exercise-archive-button";
import { EditExerciseForm } from "@/components/fitness/edit-exercise-form";
import type { ExerciseWithTags } from "@/lib/queries/fitness";
import type { CatalogItem } from "@/lib/fitness/catalog";

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  weight_training: "Weight training",
  cardio: "Cardio",
  other: "Other",
};

export function ExerciseList({
  exercises,
  muscleGroups,
  equipment,
}: {
  exercises: ExerciseWithTags[];
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {exercises.map((exercise) =>
        editingId === exercise.id ? (
          <EditExerciseForm
            key={exercise.id}
            exercise={exercise}
            muscleGroups={muscleGroups}
            equipment={equipment}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <div
            key={exercise.id}
            className="flex items-center gap-3 rounded-md border border-border bg-surface-100 px-4 py-3"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <span
                className={`text-body ${
                  exercise.isActive ? "text-ink" : "text-ink-faint line-through"
                }`}
              >
                {exercise.name}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Tag>{EXERCISE_TYPE_LABELS[exercise.exerciseType] ?? exercise.exerciseType}</Tag>
                {exercise.muscleGroups.map((group) => (
                  <Tag key={group.id}>{group.name}</Tag>
                ))}
                {exercise.equipment.map((item) => (
                  <Tag key={item.id}>{item.name}</Tag>
                ))}
                {!exercise.isActive && <Tag>Archived</Tag>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingId(exercise.id)}
              aria-label="Edit exercise"
              className="rounded-sm text-ink-faint outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <Pencil className="size-4" />
            </button>
            {exercise.isActive && <ExerciseArchiveButton id={exercise.id} />}
          </div>
        )
      )}
    </div>
  );
}
