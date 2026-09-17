"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalInsertSchema } from "@/lib/validations/goals";
import type { ActionResult } from "@/lib/types/action-result";

export async function createGoal(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = goalInsertSchema.safeParse({
    title: formData.get("title"),
    target_date: formData.get("target_date") || undefined,
  });

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

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.data.title,
    target_date: parsed.data.target_date || null,
    status: "active",
  });

  if (error) {
    console.error("createGoal failed:", error);
    return { success: false, error: "Couldn't add the goal. Try again." };
  }

  revalidatePath("/goals");
  return { success: true };
}
