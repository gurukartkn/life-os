"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  linkWorkoutLogToGoalSchema,
  unlinkGoalSchema,
  type LinkWorkoutLogToGoalInput,
} from "@/lib/validations/links";
import type { ActionResult } from "@/lib/types/action-result";

export async function linkWorkoutLogToGoal(
  input: LinkWorkoutLogToGoalInput
): Promise<ActionResult> {
  const parsed = linkWorkoutLogToGoalSchema.safeParse(input);

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

  const { error } = await supabase.from("links").upsert(
    {
      user_id: user.id,
      source_type: "workout_log",
      source_id: parsed.data.workout_log_id,
      target_type: "goal",
      target_id: parsed.data.goal_id,
    },
    { onConflict: "source_type,source_id,target_type,target_id" }
  );

  if (error) {
    console.error("linkWorkoutLogToGoal failed:", error);
    return { success: false, error: "Couldn't link to the goal. Try again." };
  }

  revalidatePath(`/fitness/log/${parsed.data.workout_log_id}`);
  return { success: true };
}

export async function unlinkGoal(id: string, workoutLogId: string): Promise<ActionResult> {
  const parsed = unlinkGoalSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("links").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("unlinkGoal failed:", error);
    return { success: false, error: "Couldn't remove the link. Try again." };
  }

  revalidatePath(`/fitness/log/${workoutLogId}`);
  return { success: true };
}
