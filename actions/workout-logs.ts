"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  startWorkoutLogSchema,
  setLogSaveSchema,
  setLogDeleteSchema,
  type SetLogSaveInput,
} from "@/lib/validations/fitness";
import { todayIso } from "@/lib/dates";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

export async function startWorkoutLog(formData: FormData) {
  const parsed = startWorkoutLogSchema.safeParse({
    workout_id: formData.get("workout_id"),
  });

  if (!parsed.success) {
    redirect("/fitness");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: user.id,
      workout_id: parsed.data.workout_id,
      performed_on: todayIso(),
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("startWorkoutLog", error);
    redirect("/fitness");
  }

  redirect(`/fitness/log/${data.id}`);
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
