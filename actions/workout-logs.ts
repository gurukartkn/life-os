"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  startWorkoutLogSchema,
  setLogSaveSchema,
  setLogDeleteSchema,
  workoutLogFinishSchema,
  type SetLogSaveInput,
} from "@/lib/validations/fitness";
import { todayIso, workoutLogStamp } from "@/lib/dates";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

export async function startWorkoutLog(formData: FormData) {
  const parsed = startWorkoutLogSchema.safeParse({
    workout_id: formData.get("workout_id"),
  });

  if (!parsed.success) {
    redirect("/fitness/workouts");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // The row exists from the moment a workout starts: performed_at takes its database
  // default (the start time) and performed_on the user's date today. finishWorkoutLog
  // restamps both when the workout is finished.
  const timeZone = await getUserTimezone(supabase);

  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: user.id,
      workout_id: parsed.data.workout_id,
      performed_on: todayIso(timeZone),
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("startWorkoutLog", error);
    redirect("/fitness/workouts");
  }

  redirect(`/fitness/log/${data.id}`);
}

// Marks a workout log finished: performed_at becomes the instant of finishing and
// performed_on that instant's date in the user's timezone.
export async function finishWorkoutLog(id: string): Promise<ActionResult> {
  const parsed = workoutLogFinishSchema.safeParse({ id });

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

  const timeZone = await getUserTimezone(supabase);

  const { data, error } = await supabase
    .from("workout_logs")
    .update(workoutLogStamp(timeZone))
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logError("finishWorkoutLog", error);
    return { success: false, error: "Couldn't finish the workout. Try again." };
  }
  if (!data) {
    return { success: false, error: "That workout log no longer exists." };
  }

  revalidatePath("/fitness", "layout");
  revalidatePath(`/fitness/log/${parsed.data.id}`);
  return { success: true };
}

export async function saveSetLog(input: SetLogSaveInput): Promise<ActionResult> {
  const parsed = setLogSaveSchema.safeParse(input);

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

  const { workout_log_id, exercise_id, set_number, weight, reps, duration_seconds } = parsed.data;

  const { data: existing, error: findError } = await supabase
    .from("set_logs")
    .select("id")
    .eq("workout_log_id", workout_log_id)
    .eq("exercise_id", exercise_id)
    .eq("set_number", set_number)
    .maybeSingle();

  if (findError) {
    logError("saveSetLog lookup", findError);
    return { success: false, error: "Couldn't save the set. Try again." };
  }

  const values = {
    weight: weight ?? null,
    reps: reps ?? null,
    duration_seconds: duration_seconds ?? null,
  };

  const { error } = existing
    ? await supabase.from("set_logs").update(values).eq("id", existing.id)
    : await supabase.from("set_logs").insert({
        user_id: user.id,
        workout_log_id,
        exercise_id,
        set_number,
        ...values,
      });

  if (error) {
    logError("saveSetLog", error);
    return { success: false, error: "Couldn't save the set. Try again." };
  }

  revalidatePath(`/fitness/log/${workout_log_id}`);
  return { success: true };
}

export async function deleteSetLog(id: string, workoutLogId: string): Promise<ActionResult> {
  const parsed = setLogDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("set_logs").delete().eq("id", parsed.data.id);

  if (error) {
    logError("deleteSetLog", error);
    return { success: false, error: "Couldn't delete the set. Try again." };
  }

  revalidatePath(`/fitness/log/${workoutLogId}`);
  return { success: true };
}
