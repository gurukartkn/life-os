export const EXERCISE_TYPES = ["cardio", "weight_training", "other"] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  weight_training: "Weight training",
  cardio: "Cardio",
  other: "Other",
};

export function exerciseTypeLabel(type: string): string {
  return EXERCISE_TYPE_LABELS[type] ?? type;
}

// "Weight training · Chest, Triceps" — the muted line under an exercise's name.
export function exerciseSummary(type: string, muscleGroups: string[]): string {
  return [exerciseTypeLabel(type), muscleGroups.join(", ")].filter(Boolean).join(" · ");
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Whole minutes between a session's start and finish; null when it has none to speak of.
export function sessionMinutes(startedAt: string, finishedAt: string): number | null {
  const minutes = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  return minutes >= 1 ? minutes : null;
}

// "55 min · 16 sets" — a session's length and size; the length is left out when unknown.
export function sessionSummary(minutes: number | null, setCount: number, suffix = ""): string {
  const sets = `${plural(setCount, "set")}${suffix}`;
  return minutes === null ? sets : `${minutes} min · ${sets}`;
}
