"use server";

import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";
import type { Tables } from "@/lib/types/database";

// FR-11: one-click export of every entity and every link, with no data
// loss — the anti-lock-in guarantee (docs/01-prd.md). RLS already scopes
// every query to the signed-in user, so no manual filtering is needed here.
export type ExportData = {
  exported_at: string;
  user_settings: Tables<"user_settings">[];
  tasks: Tables<"tasks">[];
  goals: Tables<"goals">[];
  routines: Tables<"routines">[];
  routine_items: Tables<"routine_items">[];
  routine_completions: Tables<"routine_completions">[];
  links: Tables<"links">[];
  exercises: Tables<"exercises">[];
  workouts: Tables<"workouts">[];
  workout_exercises: Tables<"workout_exercises">[];
  workout_logs: Tables<"workout_logs">[];
  set_logs: Tables<"set_logs">[];
  muscle_groups: Tables<"muscle_groups">[];
  equipment: Tables<"equipment">[];
  exercise_muscle_groups: Tables<"exercise_muscle_groups">[];
  exercise_equipment: Tables<"exercise_equipment">[];
};

export async function exportUserData(): Promise<ActionResult<ExportData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const [
    userSettings,
    tasks,
    goals,
    routines,
    routineItems,
    routineCompletions,
    links,
    exercises,
    workouts,
    workoutExercises,
    workoutLogs,
    setLogs,
    muscleGroups,
    equipment,
    exerciseMuscleGroups,
    exerciseEquipment,
  ] = await Promise.all([
    supabase.from("user_settings").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("goals").select("*"),
    supabase.from("routines").select("*"),
    supabase.from("routine_items").select("*"),
    supabase.from("routine_completions").select("*"),
    supabase.from("links").select("*"),
    supabase.from("exercises").select("*"),
    supabase.from("workouts").select("*"),
    supabase.from("workout_exercises").select("*"),
    supabase.from("workout_logs").select("*"),
    supabase.from("set_logs").select("*"),
    supabase.from("muscle_groups").select("*"),
    supabase.from("equipment").select("*"),
    supabase.from("exercise_muscle_groups").select("*"),
    supabase.from("exercise_equipment").select("*"),
  ]);

  const results = {
    userSettings,
    tasks,
    goals,
    routines,
    routineItems,
    routineCompletions,
    links,
    exercises,
    workouts,
    workoutExercises,
    workoutLogs,
    setLogs,
    muscleGroups,
    equipment,
    exerciseMuscleGroups,
    exerciseEquipment,
  };

  for (const [key, result] of Object.entries(results)) {
    if (result.error) {
      logError(`exportUserData (${key})`, result.error);
      return { success: false, error: "Couldn't export your data. Try again." };
    }
  }

  return {
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      user_settings: userSettings.data ?? [],
      tasks: tasks.data ?? [],
      goals: goals.data ?? [],
      routines: routines.data ?? [],
      routine_items: routineItems.data ?? [],
      routine_completions: routineCompletions.data ?? [],
      links: links.data ?? [],
      exercises: exercises.data ?? [],
      workouts: workouts.data ?? [],
      workout_exercises: workoutExercises.data ?? [],
      workout_logs: workoutLogs.data ?? [],
      set_logs: setLogs.data ?? [],
      muscle_groups: muscleGroups.data ?? [],
      equipment: equipment.data ?? [],
      exercise_muscle_groups: exerciseMuscleGroups.data ?? [],
      exercise_equipment: exerciseEquipment.data ?? [],
    },
  };
}
