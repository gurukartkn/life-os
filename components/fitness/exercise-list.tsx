import { Tag } from "@/components/ui/tag";
import { ExerciseArchiveButton } from "@/components/fitness/exercise-archive-button";
import type { Tables } from "@/lib/types/database";

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  weight_training: "Weight training",
  cardio: "Cardio",
  other: "Other",
};

export function ExerciseList({ exercises }: { exercises: Tables<"exercises">[] }) {
  return (
    <div className="flex flex-col gap-2">
      {exercises.map((exercise) => (
        <div
          key={exercise.id}
          className="flex items-center gap-3 rounded-md border border-border bg-surface-100 px-4 py-3"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <span
              className={`text-body ${
                exercise.is_active ? "text-ink" : "text-ink-faint line-through"
              }`}
            >
              {exercise.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Tag>{EXERCISE_TYPE_LABELS[exercise.exercise_type] ?? exercise.exercise_type}</Tag>
              {exercise.muscle_groups.map((group) => (
                <Tag key={group}>{group}</Tag>
              ))}
              {!exercise.is_active && <Tag>Archived</Tag>}
            </div>
          </div>
          {exercise.is_active && <ExerciseArchiveButton id={exercise.id} />}
        </div>
      ))}
    </div>
  );
}
