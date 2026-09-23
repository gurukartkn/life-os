import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { WorkoutEditForm, type EditableExercise } from "@/components/fitness/workout-edit-form";
import type { WorkoutUpdateInput } from "@/lib/validations/fitness";

type WorkoutRow = { id: string; name: string; notes: string | null };

type WorkoutExerciseRow = {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps: string | null;
  sort_order: number;
  exercises: { id: string; name: string; is_active: boolean } | null;
};

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes every one of these to the caller, so a missing row means "not found",
  // not "not yours".
  const [{ data: workoutData, error: workoutError }, { data: rowsData, error: rowsError }, { data: activeData, error: activeError }] =
    await Promise.all([
      supabase.from("workouts").select("id, name, notes").eq("id", id).maybeSingle(),
      supabase
        .from("workout_exercises")
        .select("id, exercise_id, target_sets, target_reps, sort_order, exercises(id, name, is_active)")
        .eq("workout_id", id)
        .order("sort_order", { ascending: true }),
      supabase.from("exercises").select("id, name").eq("is_active", true).order("name", { ascending: true }),
    ]);

  if (workoutError) logError("Load workout to edit", workoutError);
  const workout = workoutData as WorkoutRow | null;
  if (!workout) notFound();

  if (rowsError) logError("Load workout exercises to edit", rowsError);
  if (activeError) logError("Load active exercises", activeError);

  const rows = (rowsData ?? []) as unknown as WorkoutExerciseRow[];

  // The picker offers every active exercise, plus any exercise this workout already
  // uses even if it has since been archived — editing shouldn't lose an existing pick.
  const exercises: EditableExercise[] = [...(activeData ?? [])];
  const known = new Set(exercises.map((e) => e.id));
  for (const row of rows) {
    if (row.exercises && !known.has(row.exercises.id)) {
      known.add(row.exercises.id);
      exercises.push({ id: row.exercises.id, name: row.exercises.name });
    }
  }
  exercises.sort((a, b) => a.name.localeCompare(b.name));

  const initialValues: WorkoutUpdateInput = {
    id: workout.id,
    name: workout.name,
    notes: workout.notes ?? undefined,
    items: rows.map((row) => ({
      id: row.id,
      exerciseId: row.exercise_id,
      targetSets: row.target_sets ?? undefined,
      targetReps: row.target_reps ?? undefined,
    })),
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-page-title text-ink">Edit workout</h1>
      <WorkoutEditForm workout={initialValues} exercises={exercises} />
    </div>
  );
}
