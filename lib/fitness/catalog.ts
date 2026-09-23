import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import {
  catalogIdSchema,
  catalogRenameSchema,
  equipmentSchema,
  muscleGroupSchema,
} from "@/lib/validations/fitness";
import type { Database } from "@/lib/types/database";
import type { ActionResult } from "@/lib/types/action-result";

// Muscle groups and equipment are the same thing twice: a per-user catalog of names,
// linked to exercises through a join table. This is the one implementation; the two
// action files are thin typed wrappers. Nothing here puts a name into an error report —
// contexts are static and a provider error is reduced to its code by logError.

type Client = SupabaseClient<Database>;

export type CatalogKind = "muscle_groups" | "equipment";

// `duplicate_name`: another item already has the name (ignoring case).
// `in_use`: an exercise still links to the item, so it can only be archived.
export type CatalogErrorCode = "duplicate_name" | "in_use" | "not_found";

export type CatalogResult<T = undefined> = ActionResult<T> & { code?: CatalogErrorCode };

export type CatalogItem = { id: string; name: string; isActive: boolean };

const KINDS = {
  muscle_groups: {
    label: "muscle group",
    duplicate: "A muscle group with that name already exists.",
    schema: muscleGroupSchema,
    linkColumn: "muscle_group_id",
  },
  equipment: {
    label: "equipment",
    duplicate: "That equipment already exists.",
    schema: equipmentSchema,
    linkColumn: "equipment_id",
  },
} as const;

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const ITEM_COLUMNS = "id, name, is_active";

// The two catalog tables and the two join tables have identical shapes, so one typed
// builder stands in for either — `from(kind)` with a union name would not type-check.
const muscleGroupsTable = (supabase: Client) => supabase.from("muscle_groups");
const muscleGroupLinksTable = (supabase: Client) => supabase.from("exercise_muscle_groups");

function catalogTable(supabase: Client, kind: CatalogKind) {
  return kind === "muscle_groups"
    ? muscleGroupsTable(supabase)
    : (supabase.from("equipment") as unknown as ReturnType<typeof muscleGroupsTable>);
}

function linkTable(supabase: Client, kind: CatalogKind) {
  return kind === "muscle_groups"
    ? muscleGroupLinksTable(supabase)
    : (supabase.from("exercise_equipment") as unknown as ReturnType<typeof muscleGroupLinksTable>);
}

// The join column's name, typed as the muscle-group one to match the stand-in builder above.
function linkColumn(kind: CatalogKind): "muscle_group_id" {
  return KINDS[kind].linkColumn as "muscle_group_id";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function toItem(row: { id: string; name: string; is_active: boolean }): CatalogItem {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

function duplicate(kind: CatalogKind): CatalogResult<never> {
  return {
    success: false,
    error: KINDS[kind].duplicate,
    code: "duplicate_name",
  };
}

async function currentUserId(supabase: Client): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createCatalogItem(
  kind: CatalogKind,
  input: unknown
): Promise<CatalogResult<CatalogItem>> {
  const parsed = KINDS[kind].schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { success: false, error: "You need to be logged in." };

  const { data, error } = await catalogTable(supabase, kind)
    .insert({ user_id: userId, name: parsed.data.name, is_active: parsed.data.isActive })
    .select(ITEM_COLUMNS)
    .single();

  if (errorCode(error) === UNIQUE_VIOLATION) return duplicate(kind);
  if (error || !data) {
    logError(`createCatalogItem (${kind})`, error);
    return { success: false, error: `Couldn't add the ${KINDS[kind].label}. Try again.` };
  }

  revalidatePath("/fitness");
  return { success: true, data: toItem(data) };
}

// For the inline "add it while tagging an exercise" case: a name that already exists
// (ignoring case) is not an error, the existing item comes back instead. An existing
// item that was archived is returned as it is — still archived — not silently restored.
export async function createOrGetCatalogItem(
  kind: CatalogKind,
  input: unknown
): Promise<CatalogResult<CatalogItem>> {
  const created = await createCatalogItem(kind, input);
  if (created.code !== "duplicate_name") return created;

  const parsed = KINDS[kind].schema.safeParse(input);
  if (!parsed.success) return created;

  const supabase = await createClient();
  const { data, error } = await catalogTable(supabase, kind).select(ITEM_COLUMNS);
  if (error) {
    logError(`createOrGetCatalogItem (${kind})`, error);
    return { success: false, error: `Couldn't add the ${KINDS[kind].label}. Try again.` };
  }

  const wanted = parsed.data.name.toLowerCase();
  const existing = (data ?? []).find((row) => row.name.toLowerCase() === wanted);
  return existing ? { success: true, data: toItem(existing) } : created;
}

export async function renameCatalogItem(
  kind: CatalogKind,
  input: unknown
): Promise<CatalogResult<CatalogItem>> {
  const parsed = catalogRenameSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await catalogTable(supabase, kind)
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select(ITEM_COLUMNS)
    .maybeSingle();

  if (errorCode(error) === UNIQUE_VIOLATION) return duplicate(kind);
  if (error) {
    logError(`renameCatalogItem (${kind})`, error);
    return { success: false, error: `Couldn't rename the ${KINDS[kind].label}. Try again.` };
  }
  if (!data) {
    return { success: false, error: `That ${KINDS[kind].label} no longer exists.`, code: "not_found" };
  }

  revalidatePath("/fitness");
  return { success: true, data: toItem(data) };
}

// Archive and restore keep the row and every exercise link to it.
export async function setCatalogItemActive(
  kind: CatalogKind,
  id: string,
  isActive: boolean
): Promise<CatalogResult<CatalogItem>> {
  const parsed = catalogIdSchema.safeParse({ id });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await catalogTable(supabase, kind)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select(ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    logError(`setCatalogItemActive (${kind})`, error);
    return {
      success: false,
      error: `Couldn't ${isActive ? "restore" : "archive"} the ${KINDS[kind].label}. Try again.`,
    };
  }
  if (!data) {
    return { success: false, error: `That ${KINDS[kind].label} no longer exists.`, code: "not_found" };
  }

  revalidatePath("/fitness");
  return { success: true, data: toItem(data) };
}

// Deleting is allowed only while no exercise links to the item. The join tables'
// foreign keys are `on delete restrict`, so a race past the check is refused by the
// database too; either way the answer is the same `in_use` error.
export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<CatalogResult> {
  const parsed = catalogIdSchema.safeParse({ id });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const inUse: CatalogResult = {
    success: false,
    error: `Some exercises still use this ${KINDS[kind].label}. Archive it instead.`,
    code: "in_use",
  };

  const supabase = await createClient();
  const { count, error: countError } = await linkTable(supabase, kind)
    .select("exercise_id", { count: "exact", head: true })
    .eq(linkColumn(kind), parsed.data.id);

  if (countError) {
    logError(`deleteCatalogItem count (${kind})`, countError);
    return { success: false, error: `Couldn't delete the ${KINDS[kind].label}. Try again.` };
  }
  if ((count ?? 0) > 0) return inUse;

  const { data, error } = await catalogTable(supabase, kind)
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (errorCode(error) === FOREIGN_KEY_VIOLATION) return inUse;
  if (error) {
    logError(`deleteCatalogItem (${kind})`, error);
    return { success: false, error: `Couldn't delete the ${KINDS[kind].label}. Try again.` };
  }
  if (!data) {
    return { success: false, error: `That ${KINDS[kind].label} no longer exists.`, code: "not_found" };
  }

  revalidatePath("/fitness");
  return { success: true };
}

// The join tables' foreign keys do not check who owns the row they point at, so before
// linking an exercise to catalog ids, read them back through RLS: every id must come
// back, or one of them belongs to somebody else (or does not exist).
export async function ownsCatalogIds(
  supabase: Client,
  kind: CatalogKind,
  ids: string[]
): Promise<{ ok: boolean; error?: unknown }> {
  if (ids.length === 0) return { ok: true };

  const { data, error } = await catalogTable(supabase, kind).select("id").in("id", ids);
  if (error) return { ok: false, error };
  return { ok: (data?.length ?? 0) === ids.length };
}

// Makes an exercise's links match `ids` exactly: missing links are inserted first,
// then links no longer wanted are deleted, so a failure part-way never leaves the
// exercise with fewer tags than it started with. Returns the error, if any.
export async function replaceExerciseLinks(
  supabase: Client,
  kind: CatalogKind,
  exerciseId: string,
  userId: string,
  ids: string[]
): Promise<unknown> {
  const column = linkColumn(kind);

  const { data: current, error: readError } = await linkTable(supabase, kind)
    .select("*")
    .eq("exercise_id", exerciseId);
  if (readError) return readError;

  const have = new Set(
    (current ?? []).map((row) => (row as Record<string, string>)[column])
  );
  const want = new Set(ids);
  const toInsert = ids.filter((id) => !have.has(id));
  const toDelete = [...have].filter((id) => !want.has(id));

  if (toInsert.length > 0) {
    const { error } = await linkTable(supabase, kind).insert(
      toInsert.map((id) => ({ exercise_id: exerciseId, user_id: userId, [column]: id })) as never
    );
    if (error) return error;
  }

  if (toDelete.length > 0) {
    const { error } = await linkTable(supabase, kind)
      .delete()
      .eq("exercise_id", exerciseId)
      .in(column, toDelete);
    if (error) return error;
  }

  return null;
}
