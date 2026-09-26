"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkoutSchema,
  workoutDeleteSchema,
  workoutUpdateSchema,
  type CreateWorkoutInput,
  type WorkoutUpdateInput,
} from "@/lib/validations/fitness";
import { logError } from "@/lib/errors";
import { revalidateGoals } from "@/lib/goals-revalidate";
import { deleteLinksTo } from "@/lib/links-cleanup";
import type { ActionResult } from "@/lib/types/action-result";

export async function createWorkout(input: CreateWorkoutInput): Promise<ActionResult> {
  const parsed = createWorkoutSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, name: parsed.data.name, notes: parsed.data.notes || null })
    .select("id")
    .single();

  if (workoutError || !workout) {
    logError("createWorkout", workoutError);
    return { success: false, error: "Couldn't create the workout. Try again." };
  }

  const { error: exercisesError } = await supabase.from("workout_exercises").insert(
    parsed.data.exercises.map((exercise, index) => ({
      user_id: user.id,
      workout_id: workout.id,
      exercise_id: exercise.exercise_id,
      sort_order: index,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps || null,
    }))
  );

  if (exercisesError) {
    logError("createWorkout (exercises)", exercisesError);
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { success: false, error: "Couldn't add exercises to the workout. Try again." };
  }

  revalidatePath("/fitness", "layout");
  redirect("/fitness/workouts");
}

// Edits a workout in place. The workouts row is only ever updated, never deleted or
// recreated: workout_logs.workout_id is `on delete set null`, so replacing the row
// would detach every past log. Nothing here touches set_logs or workout_logs — an
// exercise dropped from the workout only loses its workout_exercises row, and its
// logged sets stay with the logs.
export async function updateWorkout(input: WorkoutUpdateInput): Promise<ActionResult> {
  const parsed = workoutUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const { id, name, notes, items } = parsed.data;

  const { data: workout, error: loadError } = await supabase
    .from("workouts")
    .select("id, workout_exercises(id)")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    logError("updateWorkout (load)", loadError);
    return { success: false, error: "Couldn't update the workout. Try again." };
  }
  if (!workout) {
    return { success: false, error: "That workout no longer exists." };
  }

  // A kept row must be one of this workout's own: upserting on a client-supplied id
  // would otherwise move a row out of another workout.
  const existingIds = new Set(workout.workout_exercises.map((row) => row.id));
  if (items.some((item) => item.id && !existingIds.has(item.id))) {
    return { success: false, error: "One of the exercises isn't part of this workout." };
  }

  // workout_exercises.exercise_id's foreign key does not check ownership either.
  const exerciseIds = [...new Set(items.map((item) => item.exerciseId))];
  const { data: ownExercises, error: ownError } = await supabase
    .from("exercises")
    .select("id")
    .in("id", exerciseIds);

  if (ownError) {
    logError("updateWorkout (exercises)", ownError);
    return { success: false, error: "Couldn't update the workout. Try again." };
  }
  if ((ownExercises?.length ?? 0) !== exerciseIds.length) {
    return { success: false, error: "One of the selected exercises isn't available." };
  }

  const { error: workoutError } = await supabase
    .from("workouts")
    .update({ name, notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (workoutError) {
    logError("updateWorkout", workoutError);
    return { success: false, error: "Couldn't update the workout. Try again." };
  }

  const rows = items.map((item, index) => ({
    id: item.id ?? crypto.randomUUID(),
    workout_id: id,
    user_id: user.id,
    exercise_id: item.exerciseId,
    sort_order: index,
    target_sets: item.targetSets ?? null,
    target_reps: item.targetReps || null,
  }));

  const { error: upsertError } = await supabase
    .from("workout_exercises")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    logError("updateWorkout (exercises)", upsertError);
    return { success: false, error: "Couldn't update the workout's exercises. Try again." };
  }

  const keptIds = new Set(rows.map((row) => row.id));
  const removedIds = [...existingIds].filter((rowId) => !keptIds.has(rowId));

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("workout_exercises")
      .delete()
      .eq("workout_id", id)
      .in("id", removedIds);

    if (deleteError) {
      logError("updateWorkout (removed exercises)", deleteError);
      return { success: false, error: "Couldn't update the workout's exercises. Try again." };
    }
  }

  revalidatePath("/fitness", "layout");
  return { success: true };
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  const parsed = workoutDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", parsed.data.id);

  if (error) {
    logError("deleteWorkout", error);
    return { success: false, error: "Couldn't delete the workout. Try again." };
  }

  await deleteLinksTo(supabase, "workout", parsed.data.id);
  revalidatePath("/fitness", "layout");
  revalidateGoals();
  return { success: true };
}
