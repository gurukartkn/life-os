import { notFound } from "next/navigation";
import { WorkoutEditor, type EditorItem } from "@/components/fitness/workout-editor";
import { getWorkoutEditorData } from "@/lib/fitness/editor-data";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type WorkoutExerciseRow = {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps: string | null;
};

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes every one of these to the caller, so a missing row means "not found",
  // not "not yours".
  const [{ data: workout, error: workoutError }, { data: rowsData, error: rowsError }, editorData] =
    await Promise.all([
      supabase.from("workouts").select("id, name, notes").eq("id", id).maybeSingle(),
      supabase
        .from("workout_exercises")
        .select("id, exercise_id, target_sets, target_reps")
        .eq("workout_id", id)
        .order("sort_order", { ascending: true }),
      getWorkoutEditorData(supabase),
    ]);

  if (workoutError) logError("Load workout to edit", workoutError);
  if (!workout) notFound();
  if (rowsError) logError("Load workout exercises to edit", rowsError);

  const initialItems: EditorItem[] = ((rowsData ?? []) as WorkoutExerciseRow[]).map((row) => ({
    key: row.id,
    id: row.id,
    exerciseId: row.exercise_id,
    targetSets: String(row.target_sets ?? 3),
    targetReps: row.target_reps ?? "",
  }));

  return (
    <WorkoutEditor
      workout={workout}
      initialItems={initialItems}
      exercises={editorData.exercises}
      muscleGroups={editorData.muscleGroups}
      equipment={editorData.equipment}
    />
  );
}
