"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exerciseInsertSchema, exerciseArchiveSchema } from "@/lib/validations/fitness";
import type { ActionResult } from "@/lib/types/action-result";

function csvToArray(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function createExercise(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = exerciseInsertSchema.safeParse({
    name: formData.get("name"),
    exercise_type: formData.get("exercise_type"),
    muscle_groups: formData.get("muscle_groups") || undefined,
    equipment: formData.get("equipment") || undefined,
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

  const { error } = await supabase.from("exercises").insert({
    user_id: user.id,
    name: parsed.data.name,
    exercise_type: parsed.data.exercise_type,
    muscle_groups: csvToArray(parsed.data.muscle_groups),
    equipment: csvToArray(parsed.data.equipment),
  });

  if (error) {
    console.error("createExercise failed:", error);
    return { success: false, error: "Couldn't add the exercise. Try again." };
  }

  revalidatePath("/fitness");
  return { success: true };
}

export async function archiveExercise(id: string): Promise<ActionResult> {
  const parsed = exerciseArchiveSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("archiveExercise failed:", error);
    return { success: false, error: "Couldn't archive the exercise. Try again." };
  }

  revalidatePath("/fitness");
  return { success: true };
}
