import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogItems, loadExercisesWithTags } from "@/lib/queries/fitness";
import type { Database } from "@/lib/types/database";

export type PickerExercise = { id: string; name: string; exerciseType: string; muscleGroups: string[]; isActive: boolean };

// What the workout editor's picker and its "New exercise…" modal need: every exercise
// (the picker shows active ones, plus any archived one the workout already uses) and
// the active catalog items.
export async function getWorkoutEditorData(supabase: SupabaseClient<Database>) {
  const [{ exercises }, muscleGroups, equipment] = await Promise.all([
    loadExercisesWithTags(supabase),
    getCatalogItems(supabase, "muscle_groups"),
    getCatalogItems(supabase, "equipment"),
  ]);

  const pickerExercises: PickerExercise[] = exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    exerciseType: exercise.exerciseType,
    muscleGroups: exercise.muscleGroups.map((group) => group.name),
    isActive: exercise.isActive,
  }));

  return { exercises: pickerExercises, muscleGroups, equipment };
}
