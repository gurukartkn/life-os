"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  routineActiveSchema,
  routineCompletionToggleSchema,
  routineFormSchema,
  routineUpdateSchema,
  type RoutineFormInput,
  type RoutineFormValues,
} from "@/lib/validations/routines";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

function routineColumns(values: RoutineFormValues) {
  return {
    title: values.title,
    time_of_day: values.timeOfDay,
    frequency: values.frequency,
    times_per_week: values.timesPerWeek,
    weekdays: values.weekdays,
  };
}

function itemColumns(item: RoutineFormValues["items"][number], sortOrder: number) {
  return {
    title: item.title,
    repeat_rule: item.repeatRule,
    repeat_every: item.repeatEvery,
    is_active: item.isActive,
    sort_order: sortOrder,
  };
}

// Pages that show routines: the Routines page and the Today dashboard.
function revalidateRoutines() {
  revalidatePath("/routines", "layout");
  revalidatePath("/");
}

export async function createRoutine(input: RoutineFormInput): Promise<ActionResult> {
  const parsed = routineFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ user_id: user.id, ...routineColumns(parsed.data) })
    .select("id")
    .single();

  if (routineError || !routine) {
    logError("createRoutine", routineError);
    return { success: false, error: "Couldn't create the routine. Try again." };
  }

  const { error: itemsError } = await supabase.from("routine_items").insert(
    parsed.data.items.map((item, index) => ({
      user_id: user.id,
      routine_id: routine.id,
      ...itemColumns(item, index),
    }))
  );

  if (itemsError) {
    logError("createRoutine (items)", itemsError);
    await supabase.from("routines").delete().eq("id", routine.id);
    return { success: false, error: "Couldn't add items to the routine. Try again." };
  }

  revalidateRoutines();
  redirect("/routines");
}

// Saves the whole edited routine: its details, then every item in order — kept items
// updated in place (their completions stay), new ones inserted, and any existing item
// left out of the list removed along with its history.
export async function updateRoutine(id: string, input: RoutineFormInput): Promise<ActionResult> {
  const parsedId = routineUpdateSchema.safeParse({ id });
  const parsed = routineFormSchema.safeParse(input);
  if (!parsedId.success) return { success: false, error: parsedId.error.issues[0]?.message };
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const failed = (context: string, error: unknown): ActionResult => {
    logError(context, error);
    return { success: false, error: "Couldn't save the routine. Try again." };
  };

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .update(routineColumns(parsed.data))
    .eq("id", parsedId.data.id)
    .select("id")
    .maybeSingle();
  if (routineError) return failed("updateRoutine", routineError);
  if (!routine) return { success: false, error: "That routine no longer exists." };

  const { data: existing, error: readError } = await supabase
    .from("routine_items")
    .select("id")
    .eq("routine_id", routine.id);
  if (readError) return failed("updateRoutine (read items)", readError);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const keptIds = new Set(parsed.data.items.flatMap((item) => (item.id ? [item.id] : [])));
  if ([...keptIds].some((itemId) => !existingIds.has(itemId))) {
    return { success: false, error: "An item doesn't belong to this routine." };
  }

  for (const [index, item] of parsed.data.items.entries()) {
    const { error } = item.id
      ? await supabase.from("routine_items").update(itemColumns(item, index)).eq("id", item.id)
      : await supabase
          .from("routine_items")
          .insert({ user_id: user.id, routine_id: routine.id, ...itemColumns(item, index) });
    if (error) return failed("updateRoutine (item)", error);
  }

  const removed = [...existingIds].filter((itemId) => !keptIds.has(itemId));
  if (removed.length > 0) {
    const { error } = await supabase.from("routine_items").delete().in("id", removed);
    if (error) return failed("updateRoutine (remove items)", error);
  }

  revalidateRoutines();
  return { success: true };
}

// Archive hides a routine from the Routines page and Today; restore brings it back.
// Its items and history are kept either way.
export async function setRoutineActive(id: string, isActive: boolean): Promise<ActionResult> {
  const parsed = routineActiveSchema.safeParse({ id, isActive });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("routines").update({ is_active: parsed.data.isActive }).eq("id", parsed.data.id);

  if (error) {
    logError("setRoutineActive", error);
    return { success: false, error: `Couldn't ${isActive ? "restore" : "archive"} the routine. Try again.` };
  }

  revalidateRoutines();
  return { success: true };
}

// Checks an item off for a day (the user's today), or unchecks it.
export async function toggleRoutineItem(
  routineItemId: string,
  periodStart: string,
  isChecking: boolean
): Promise<ActionResult> {
  const parsed = routineCompletionToggleSchema.safeParse({
    routine_item_id: routineItemId,
    period_start: periodStart,
    is_checking: isChecking,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();

  if (parsed.data.is_checking) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "You need to be logged in." };

    const { error } = await supabase.from("routine_completions").upsert(
      {
        user_id: user.id,
        routine_item_id: parsed.data.routine_item_id,
        period_start: parsed.data.period_start,
      },
      { onConflict: "routine_item_id,period_start" }
    );

    if (error) {
      logError("toggleRoutineItem (check)", error);
      return { success: false, error: "Couldn't update the item. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("routine_completions")
      .delete()
      .eq("routine_item_id", parsed.data.routine_item_id)
      .eq("period_start", parsed.data.period_start);

    if (error) {
      logError("toggleRoutineItem (uncheck)", error);
      return { success: false, error: "Couldn't update the item. Try again." };
    }
  }

  revalidateRoutines();
  return { success: true };
}
