"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { todayIso } from "@/lib/dates";
import { nextAchievedOn } from "@/lib/goals";
import { goalIdSchema, goalInputSchema, goalToRow, goalUpdateSchema, toGoalStatus } from "@/lib/validations/goals";
import { revalidateGoals } from "@/lib/goals-revalidate";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

function formFields(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    targetDate: formData.get("targetDate") ?? "",
    status: formData.get("status") ?? "active",
  };
}

export async function createGoal(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = goalInputSchema.safeParse(formFields(formData));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  // A goal saved as already achieved was reached today, in the user's timezone.
  const today = todayIso(await getUserTimezone(supabase));
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    ...goalToRow(parsed.data, nextAchievedOn("active", parsed.data.status, null, today)),
  });

  if (error) {
    logError("createGoal", error);
    return { success: false, error: "Couldn't add the goal. Try again." };
  }

  revalidateGoals();
  return { success: true };
}

export async function updateGoal(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = goalUpdateSchema.safeParse({ id: formData.get("id"), ...formFields(formData) });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const [{ data: current, error: readError }, timeZone] = await Promise.all([
    supabase.from("goals").select("status, achieved_on").eq("id", parsed.data.id).maybeSingle(),
    getUserTimezone(supabase),
  ]);

  if (readError) {
    logError("updateGoal (read)", readError);
    return { success: false, error: "Couldn't save the goal. Try again." };
  }
  if (!current) return { success: false, error: "That goal no longer exists." };

  const achievedOn = nextAchievedOn(
    toGoalStatus(current.status),
    parsed.data.status,
    current.achieved_on,
    todayIso(timeZone)
  );

  const { error } = await supabase
    .from("goals")
    .update({ ...goalToRow(parsed.data, achievedOn), updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    logError("updateGoal", error);
    return { success: false, error: "Couldn't save the goal. Try again." };
  }

  revalidateGoals();
  return { success: true };
}

// Links are polymorphic, so nothing cascades them: the goal's links go first, then the goal.
export async function deleteGoal(id: string): Promise<ActionResult> {
  const parsed = goalIdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That goal no longer exists." };

  const supabase = await createClient();
  const { error: linksError } = await supabase
    .from("links")
    .delete()
    .eq("source_type", "goal")
    .eq("source_id", parsed.data);

  if (linksError) {
    logError("deleteGoal (links)", linksError);
    return { success: false, error: "Couldn't delete the goal. Try again." };
  }

  const { error } = await supabase.from("goals").delete().eq("id", parsed.data);
  if (error) {
    logError("deleteGoal", error);
    return { success: false, error: "Couldn't delete the goal. Try again." };
  }

  revalidateGoals();
  return { success: true };
}
