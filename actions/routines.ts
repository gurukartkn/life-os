"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createRoutineSchema,
  routineCompletionToggleSchema,
  routineDeleteSchema,
  routineItemArchiveSchema,
  routineItemInsertSchema,
  type CreateRoutineInput,
  type RoutineItemInsertInput,
} from "@/lib/validations/routines";
import type { ActionResult } from "@/lib/types/action-result";

export async function createRoutine(input: CreateRoutineInput): Promise<ActionResult> {
  const parsed = createRoutineSchema.safeParse(input);

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

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ user_id: user.id, title: parsed.data.title, cadence: parsed.data.cadence })
    .select("id")
    .single();

  if (routineError || !routine) {
    console.error("createRoutine failed:", routineError);
    return { success: false, error: "Couldn't create the routine. Try again." };
  }

  const { error: itemsError } = await supabase.from("routine_items").insert(
    parsed.data.items.map((item, index) => ({
      user_id: user.id,
      routine_id: routine.id,
      title: item.title,
      sort_order: index,
    }))
  );

  if (itemsError) {
    console.error("createRoutine (items) failed:", itemsError);
    await supabase.from("routines").delete().eq("id", routine.id);
    return { success: false, error: "Couldn't add items to the routine. Try again." };
  }

  revalidatePath("/routines");
  redirect("/routines");
}

export async function deleteRoutine(id: string): Promise<ActionResult> {
  const parsed = routineDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("deleteRoutine failed:", error);
    return { success: false, error: "Couldn't delete the routine. Try again." };
  }

  revalidatePath("/routines");
  return { success: true };
}

export async function addRoutineItem(input: RoutineItemInsertInput): Promise<ActionResult> {
  const parsed = routineItemInsertSchema.safeParse(input);

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

  const { count } = await supabase
    .from("routine_items")
    .select("id", { count: "exact", head: true })
    .eq("routine_id", parsed.data.routine_id);

  const { error } = await supabase.from("routine_items").insert({
    user_id: user.id,
    routine_id: parsed.data.routine_id,
    title: parsed.data.title,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("addRoutineItem failed:", error);
    return { success: false, error: "Couldn't add the item. Try again." };
  }

  revalidatePath(`/routines/${parsed.data.routine_id}`);
  revalidatePath("/routines");
  return { success: true };
}

export async function archiveRoutineItem(id: string, routineId: string): Promise<ActionResult> {
  const parsed = routineItemArchiveSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_items")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("archiveRoutineItem failed:", error);
    return { success: false, error: "Couldn't remove the item. Try again." };
  }

  revalidatePath(`/routines/${routineId}`);
  revalidatePath("/routines");
  return { success: true };
}

export async function toggleRoutineItem(
  routineItemId: string,
  periodStart: string,
  isChecking: boolean,
  routineId: string
): Promise<ActionResult> {
  const parsed = routineCompletionToggleSchema.safeParse({
    routine_item_id: routineItemId,
    period_start: periodStart,
    is_checking: isChecking,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();

  if (parsed.data.is_checking) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You need to be logged in." };
    }

    const { error } = await supabase.from("routine_completions").upsert(
      {
        user_id: user.id,
        routine_item_id: parsed.data.routine_item_id,
        period_start: parsed.data.period_start,
      },
      { onConflict: "routine_item_id,period_start" }
    );

    if (error) {
      console.error("toggleRoutineItem (check) failed:", error);
      return { success: false, error: "Couldn't update the item. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("routine_completions")
      .delete()
      .eq("routine_item_id", parsed.data.routine_item_id)
      .eq("period_start", parsed.data.period_start);

    if (error) {
      console.error("toggleRoutineItem (uncheck) failed:", error);
      return { success: false, error: "Couldn't update the item. Try again." };
    }
  }

  revalidatePath(`/routines/${routineId}`);
  revalidatePath("/routines");
  return { success: true };
}
