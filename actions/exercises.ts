"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  exerciseArchiveSchema,
  exerciseCreateSchema,
  exerciseUpdateSchema,
  type ExerciseCreateInput,
  type ExerciseUpdateInput,
} from "@/lib/validations/fitness";
import { ownsCatalogIds, replaceExerciseLinks } from "@/lib/fitness/catalog";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

const TAGS_NOT_AVAILABLE = "One of the selected muscle groups or equipment isn't available.";

// Creates an exercise tagged with muscle groups and equipment by id (the join tables).
// Every id is checked to be the caller's own first: the join tables' foreign keys do not.
export async function createExerciseWithTags(
  input: ExerciseCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = exerciseCreateSchema.safeParse(input);

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

  const muscleGroupIds = [...new Set(parsed.data.muscleGroupIds)];
  const equipmentIds = [...new Set(parsed.data.equipmentIds)];

  const ownMuscleGroups = await ownsCatalogIds(supabase, "muscle_groups", muscleGroupIds);
  const ownEquipment = await ownsCatalogIds(supabase, "equipment", equipmentIds);
  for (const check of [ownMuscleGroups, ownEquipment]) {
    if (check.error) {
      logError("createExerciseWithTags (ownership)", check.error);
      return { success: false, error: "Couldn't add the exercise. Try again." };
    }
  }
  if (!ownMuscleGroups.ok || !ownEquipment.ok) {
    return { success: false, error: TAGS_NOT_AVAILABLE };
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .insert({ user_id: user.id, name: parsed.data.name, exercise_type: parsed.data.exerciseType })
    .select("id")
    .single();

  if (error || !exercise) {
    logError("createExerciseWithTags", error);
    return { success: false, error: "Couldn't add the exercise. Try again." };
  }

  const linkError =
    (await replaceExerciseLinks(supabase, "muscle_groups", exercise.id, user.id, muscleGroupIds)) ??
    (await replaceExerciseLinks(supabase, "equipment", exercise.id, user.id, equipmentIds));

  if (linkError) {
    logError("createExerciseWithTags (tags)", linkError);
    // The exercise's links cascade with it, so this leaves nothing half-made behind.
    await supabase.from("exercises").delete().eq("id", exercise.id);
    return { success: false, error: "Couldn't add the exercise. Try again." };
  }

  revalidatePath("/fitness", "layout");
  return { success: true, data: { id: exercise.id } };
}

// Edits an exercise and replaces its tag sets: missing links are added and links
// that are no longer in the lists are removed.
export async function updateExercise(input: ExerciseUpdateInput): Promise<ActionResult> {
  const parsed = exerciseUpdateSchema.safeParse(input);

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

  const { data: existing, error: findError } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (findError) {
    logError("updateExercise (load)", findError);
    return { success: false, error: "Couldn't update the exercise. Try again." };
  }
  if (!existing) {
    return { success: false, error: "That exercise no longer exists." };
  }

  const muscleGroupIds = [...new Set(parsed.data.muscleGroupIds)];
  const equipmentIds = [...new Set(parsed.data.equipmentIds)];

  const ownMuscleGroups = await ownsCatalogIds(supabase, "muscle_groups", muscleGroupIds);
  const ownEquipment = await ownsCatalogIds(supabase, "equipment", equipmentIds);
  for (const check of [ownMuscleGroups, ownEquipment]) {
    if (check.error) {
      logError("updateExercise (ownership)", check.error);
      return { success: false, error: "Couldn't update the exercise. Try again." };
    }
  }
  if (!ownMuscleGroups.ok || !ownEquipment.ok) {
    return { success: false, error: TAGS_NOT_AVAILABLE };
  }

  const { error } = await supabase
    .from("exercises")
    .update({
      name: parsed.data.name,
      exercise_type: parsed.data.exerciseType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) {
    logError("updateExercise", error);
    return { success: false, error: "Couldn't update the exercise. Try again." };
  }

  const linkError =
    (await replaceExerciseLinks(supabase, "muscle_groups", parsed.data.id, user.id, muscleGroupIds)) ??
    (await replaceExerciseLinks(supabase, "equipment", parsed.data.id, user.id, equipmentIds));

  if (linkError) {
    logError("updateExercise (tags)", linkError);
    return { success: false, error: "Couldn't update the exercise's tags. Try again." };
  }

  revalidatePath("/fitness", "layout");
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
    logError("archiveExercise", error);
    return { success: false, error: "Couldn't archive the exercise. Try again." };
  }

  revalidatePath("/fitness", "layout");
  return { success: true };
}
