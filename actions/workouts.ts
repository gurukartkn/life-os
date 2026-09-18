"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkoutSchema,
  workoutDeleteSchema,
  type CreateWorkoutInput,
} from "@/lib/validations/fitness";
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
    console.error("createWorkout failed:", workoutError);
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
    console.error("createWorkout (exercises) failed:", exercisesError);
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { success: false, error: "Couldn't add exercises to the workout. Try again." };
  }

  revalidatePath("/fitness");
  redirect("/fitness");
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  const parsed = workoutDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("deleteWorkout failed:", error);
    return { success: false, error: "Couldn't delete the workout. Try again." };
  }

  revalidatePath("/fitness");
  return { success: true };
}
