"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidateGoals } from "@/lib/goals-revalidate";
import {
  goalIdSchema,
  linkTargetSchema,
  setLinksSchema,
  type LinkItemType,
  type LinkTarget,
} from "@/lib/validations/goals";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";
import type { Database } from "@/lib/types/database";

// Linking goals to tasks, routines, workouts and exercises (5a · Goal detail). A goal is
// always the link's source (links_goal_is_source_check). Links are polymorphic, so no
// foreign key vouches for either end: the goal and the items are read back through RLS
// first, which proves they exist and belong to the caller before a link is written.

type Client = SupabaseClient<Database>;

const ITEM_TABLES: Record<LinkItemType, "tasks" | "routines" | "workouts" | "exercises"> = {
  task: "tasks",
  routine: "routines",
  workout: "workouts",
  exercise: "exercises",
};

const GONE = "That no longer exists.";

async function ownsGoal(supabase: Client, goalId: string) {
  return supabase.from("goals").select("id").eq("id", goalId).maybeSingle();
}

// Which of `ids` of this type the caller can see.
async function ownedItemIds(supabase: Client, type: LinkItemType, ids: string[]) {
  if (ids.length === 0) return { data: new Set<string>(), error: null };
  const { data, error } = await supabase.from(ITEM_TABLES[type]).select("id").in("id", ids);
  return { data: new Set((data ?? []).map((row) => row.id)), error };
}

async function checkOwnership(
  supabase: Client,
  goalId: string,
  type: LinkItemType,
  ids: string[]
): Promise<{ ok: true } | { ok: false; result: ActionResult }> {
  const [goal, items] = await Promise.all([ownsGoal(supabase, goalId), ownedItemIds(supabase, type, ids)]);
  if (goal.error || items.error) {
    logError("links (ownership check)", goal.error ?? items.error);
    return { ok: false, result: { success: false, error: "Couldn't save the links. Try again." } };
  }
  if (!goal.data || items.data.size !== new Set(ids).size) {
    return { ok: false, result: { success: false, error: GONE } };
  }
  return { ok: true };
}

export async function linkItem(goalId: string, target: LinkTarget): Promise<ActionResult> {
  const goal = goalIdSchema.safeParse(goalId);
  const item = linkTargetSchema.safeParse(target);
  if (!goal.success || !item.success) return { success: false, error: GONE };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const check = await checkOwnership(supabase, goal.data, item.data.type, [item.data.id]);
  if (!check.ok) return check.result;

  // Linking what is already linked leaves the one row there.
  const { error } = await supabase.from("links").upsert(
    {
      user_id: user.id,
      source_type: "goal",
      source_id: goal.data,
      target_type: item.data.type,
      target_id: item.data.id,
    },
    { onConflict: "source_type,source_id,target_type,target_id", ignoreDuplicates: true }
  );

  if (error) {
    logError("linkItem", error);
    return { success: false, error: "Couldn't link that. Try again." };
  }

  revalidateGoals();
  return { success: true };
}

export async function unlinkItem(goalId: string, target: LinkTarget): Promise<ActionResult> {
  const goal = goalIdSchema.safeParse(goalId);
  const item = linkTargetSchema.safeParse(target);
  if (!goal.success || !item.success) return { success: false, error: GONE };

  const supabase = await createClient();
  const check = await checkOwnership(supabase, goal.data, item.data.type, [item.data.id]);
  if (!check.ok) return check.result;

  const { error } = await supabase
    .from("links")
    .delete()
    .eq("source_type", "goal")
    .eq("source_id", goal.data)
    .eq("target_type", item.data.type)
    .eq("target_id", item.data.id);

  if (error) {
    logError("unlinkItem", error);
    return { success: false, error: "Couldn't unlink that. Try again." };
  }

  revalidateGoals();
  return { success: true };
}

// The Link picker's save: after it, the goal links to exactly `ids` of this type. Only
// the difference is written — new links added, unticked ones removed.
export async function setLinks(goalId: string, type: LinkItemType, ids: string[]): Promise<ActionResult> {
  const parsed = setLinksSchema.safeParse({ goalId, type, ids });
  if (!parsed.success) return { success: false, error: GONE };
  const wanted = new Set(parsed.data.ids);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const [check, current] = await Promise.all([
    checkOwnership(supabase, parsed.data.goalId, parsed.data.type, [...wanted]),
    supabase
      .from("links")
      .select("target_id")
      .eq("source_type", "goal")
      .eq("source_id", parsed.data.goalId)
      .eq("target_type", parsed.data.type),
  ]);
  if (!check.ok) return check.result;
  if (current.error) {
    logError("setLinks (read)", current.error);
    return { success: false, error: "Couldn't save the links. Try again." };
  }

  const existing = new Set((current.data ?? []).map((row) => row.target_id));
  const toAdd = [...wanted].filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !wanted.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase.from("links").upsert(
      toAdd.map((id) => ({
        user_id: user.id,
        source_type: "goal",
        source_id: parsed.data.goalId,
        target_type: parsed.data.type,
        target_id: id,
      })),
      { onConflict: "source_type,source_id,target_type,target_id", ignoreDuplicates: true }
    );
    if (error) {
      logError("setLinks (add)", error);
      return { success: false, error: "Couldn't save the links. Try again." };
    }
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("links")
      .delete()
      .eq("source_type", "goal")
      .eq("source_id", parsed.data.goalId)
      .eq("target_type", parsed.data.type)
      .in("target_id", toRemove);
    if (error) {
      logError("setLinks (remove)", error);
      return { success: false, error: "Couldn't save the links. Try again." };
    }
  }

  revalidateGoals();
  return { success: true };
}
