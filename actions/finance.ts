"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { flagDuplicates } from "@/lib/finance/duplicates";
import { anchorDayOf, isRealDate, nextOccurrence, type FinanceKind } from "@/lib/finance/money";
import type { Database } from "@/lib/types/database";
import type { ActionResult } from "@/lib/types/action-result";
import {
  ACCOUNT_COLUMNS,
  accountFromRow,
  accountInputSchema,
  budgetInputSchema,
  CATEGORY_COLUMNS,
  categoryFromRow,
  categoryInputSchema,
  CSV_MAX_ROWS,
  csvImportRowSchema,
  idSchema,
  recurringInputSchema,
  recurringToRow,
  recurringUpdateSchema,
  renameSchema,
  toFrequency,
  toKind,
  transactionInputSchema,
  transactionToRow,
  transactionUpdateSchema,
  type Account,
  type Category,
  type CsvImportRow,
} from "@/lib/validations/finance";

// Finance's Server Actions (Stage 5b, ADR-001). Every error report carries a static
// context and, through logError, only the provider's error code — never an amount, a
// note, an account or category name, or anything from an imported file (ADR-008).

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

export type LabelResult<T = undefined> = ActionResult<T> & { code?: "duplicate_name" | "not_found" };

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
}

function now(): string {
  return new Date().toISOString();
}

async function currentUserId(supabase: Client): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function revalidateFinance() {
  revalidatePath("/finance", "layout");
  revalidatePath("/today");
}

const NOT_LOGGED_IN = { success: false, error: "You need to be logged in." } as const;

function firstIssue(error: z.ZodError): string | undefined {
  return error.issues[0]?.message;
}

// ── Accounts and categories ──────────────────────────────────────────────────────────

export async function createAccount(input: { name: string }): Promise<LabelResult<Account>> {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const { data, error } = await supabase
    .from("finance_accounts")
    .insert({ user_id: userId, name: parsed.data.name })
    .select(ACCOUNT_COLUMNS)
    .single();
  if (errorCode(error) === UNIQUE_VIOLATION) {
    return { success: false, error: "An account with that name already exists.", code: "duplicate_name" };
  }
  if (error || !data) {
    logError("createAccount", error);
    return { success: false, error: "Couldn't add the account. Try again." };
  }
  revalidateFinance();
  return { success: true, data: accountFromRow(data) };
}

export async function createCategory(input: { name: string; kind: FinanceKind }): Promise<LabelResult<Category>> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const { data, error } = await supabase
    .from("finance_categories")
    .insert({ user_id: userId, name: parsed.data.name, kind: parsed.data.kind })
    .select(CATEGORY_COLUMNS)
    .single();
  if (errorCode(error) === UNIQUE_VIOLATION) {
    return { success: false, error: "A category with that name already exists.", code: "duplicate_name" };
  }
  if (error || !data) {
    logError("createCategory", error);
    return { success: false, error: "Couldn't add the category. Try again." };
  }
  revalidateFinance();
  return { success: true, data: categoryFromRow(data) };
}

export async function renameAccount(id: string, name: string): Promise<LabelResult<Account>> {
  const parsed = renameSchema.safeParse({ id, name });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_accounts")
    .update({ name: parsed.data.name, updated_at: now() })
    .eq("id", parsed.data.id)
    .select(ACCOUNT_COLUMNS)
    .maybeSingle();
  if (errorCode(error) === UNIQUE_VIOLATION) {
    return { success: false, error: "An account with that name already exists.", code: "duplicate_name" };
  }
  if (error) {
    logError("renameAccount", error);
    return { success: false, error: "Couldn't rename the account. Try again." };
  }
  if (!data) return { success: false, error: "That account no longer exists.", code: "not_found" };
  revalidateFinance();
  return { success: true, data: accountFromRow(data) };
}

export async function renameCategory(id: string, name: string): Promise<LabelResult<Category>> {
  const parsed = renameSchema.safeParse({ id, name });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_categories")
    .update({ name: parsed.data.name, updated_at: now() })
    .eq("id", parsed.data.id)
    .select(CATEGORY_COLUMNS)
    .maybeSingle();
  if (errorCode(error) === UNIQUE_VIOLATION) {
    return { success: false, error: "A category with that name already exists.", code: "duplicate_name" };
  }
  if (error) {
    logError("renameCategory", error);
    return { success: false, error: "Couldn't rename the category. Try again." };
  }
  if (!data) return { success: false, error: "That category no longer exists.", code: "not_found" };
  revalidateFinance();
  return { success: true, data: categoryFromRow(data) };
}

// Archive and restore keep the row and every transaction on it: archived labels are only
// left out of the pickers. There is no delete.
async function setAccountActive(id: string, isActive: boolean): Promise<LabelResult<Account>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That account no longer exists.", code: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_accounts")
    .update({ is_active: isActive, updated_at: now() })
    .eq("id", parsed.data)
    .select(ACCOUNT_COLUMNS)
    .maybeSingle();
  if (error) {
    logError("setAccountActive", error);
    return { success: false, error: `Couldn't ${isActive ? "restore" : "archive"} the account. Try again.` };
  }
  if (!data) return { success: false, error: "That account no longer exists.", code: "not_found" };
  revalidateFinance();
  return { success: true, data: accountFromRow(data) };
}

async function setCategoryActive(id: string, isActive: boolean): Promise<LabelResult<Category>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That category no longer exists.", code: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_categories")
    .update({ is_active: isActive, updated_at: now() })
    .eq("id", parsed.data)
    .select(CATEGORY_COLUMNS)
    .maybeSingle();
  if (error) {
    logError("setCategoryActive", error);
    return { success: false, error: `Couldn't ${isActive ? "restore" : "archive"} the category. Try again.` };
  }
  if (!data) return { success: false, error: "That category no longer exists.", code: "not_found" };
  revalidateFinance();
  return { success: true, data: categoryFromRow(data) };
}

export async function archiveAccount(id: string): Promise<LabelResult<Account>> {
  return setAccountActive(id, false);
}

export async function restoreAccount(id: string): Promise<LabelResult<Account>> {
  return setAccountActive(id, true);
}

export async function archiveCategory(id: string): Promise<LabelResult<Category>> {
  return setCategoryActive(id, false);
}

export async function restoreCategory(id: string): Promise<LabelResult<Category>> {
  return setCategoryActive(id, true);
}

// ── Picking an account and a category ────────────────────────────────────────────────

// The pickers offer active accounts, and active categories of the item's kind, so a save
// is checked for the same thing. An archived label an item already uses may stay on it
// (editing an old transaction's note mustn't force a new account), but can't be newly
// chosen. Returns a sentence for the form, or null when the pick is fine.
async function checkPicks(
  supabase: Client,
  picks: { accountId: string; categoryId: string | null; kind: FinanceKind },
  current: { accountId: string; categoryId: string | null } | null
): Promise<{ problem: string | null; error?: unknown }> {
  const [account, category] = await Promise.all([
    supabase.from("finance_accounts").select("is_active").eq("id", picks.accountId).maybeSingle(),
    picks.categoryId
      ? supabase.from("finance_categories").select("kind, is_active").eq("id", picks.categoryId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (account.error || category.error) return { problem: null, error: account.error ?? category.error };

  if (!account.data) return { problem: "That account no longer exists." };
  if (!account.data.is_active && current?.accountId !== picks.accountId) {
    return { problem: "That account is archived. Pick another." };
  }
  if (picks.categoryId) {
    if (!category.data) return { problem: "That category no longer exists." };
    if (toKind(category.data.kind) !== picks.kind) {
      return { problem: `Pick an ${picks.kind === "income" ? "income" : "expense"} category.` };
    }
    if (!category.data.is_active && current?.categoryId !== picks.categoryId) {
      return { problem: "That category is archived. Pick another." };
    }
  }
  return { problem: null };
}

// ── Transactions ────────────────────────────────────────────────────────────────────

function transactionFields(formData: FormData) {
  return {
    kind: formData.get("kind") ?? "",
    amount: formData.get("amount") ?? "",
    occurredOn: formData.get("occurredOn") ?? "",
    accountId: formData.get("accountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    note: formData.get("note") ?? "",
  };
}

export async function createTransaction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = transactionInputSchema.safeParse(transactionFields(formData));
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const failed = { success: false, error: "Couldn't add the transaction. Try again." };
  const { problem, error: checkError } = await checkPicks(
    supabase,
    { accountId: parsed.data.accountId, categoryId: parsed.data.categoryId ?? null, kind: parsed.data.kind },
    null
  );
  if (checkError) {
    logError("createTransaction (check)", checkError);
    return failed;
  }
  if (problem) return { success: false, error: problem };

  const { error } = await supabase
    .from("transactions")
    .insert({ user_id: userId, ...transactionToRow(parsed.data), source: "manual" });
  if (errorCode(error) === FOREIGN_KEY_VIOLATION) {
    return { success: false, error: "That account or category no longer exists." };
  }
  if (error) {
    logError("createTransaction", error);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

export async function updateTransaction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = transactionUpdateSchema.safeParse({ id: formData.get("id"), ...transactionFields(formData) });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const failed = { success: false, error: "Couldn't save the transaction. Try again." };
  const { data: current, error: readError } = await supabase
    .from("transactions")
    .select("account_id, category_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    logError("updateTransaction (read)", readError);
    return failed;
  }
  if (!current) return { success: false, error: "That transaction no longer exists." };

  const { problem, error: checkError } = await checkPicks(
    supabase,
    { accountId: parsed.data.accountId, categoryId: parsed.data.categoryId ?? null, kind: parsed.data.kind },
    { accountId: current.account_id, categoryId: current.category_id }
  );
  if (checkError) {
    logError("updateTransaction (check)", checkError);
    return failed;
  }
  if (problem) return { success: false, error: problem };

  const { error } = await supabase
    .from("transactions")
    .update({ ...transactionToRow(parsed.data), updated_at: now() })
    .eq("id", parsed.data.id);
  if (errorCode(error) === FOREIGN_KEY_VIOLATION) {
    return { success: false, error: "That account or category no longer exists." };
  }
  if (error) {
    logError("updateTransaction", error);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That transaction no longer exists." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").delete().eq("id", parsed.data).select("id").maybeSingle();
  if (error) {
    logError("deleteTransaction", error);
    return { success: false, error: "Couldn't delete the transaction. Try again." };
  }
  if (!data) return { success: false, error: "That transaction no longer exists." };
  revalidateFinance();
  return { success: true };
}

// ── Budgets ─────────────────────────────────────────────────────────────────────────

// One monthly amount per category: setting it again replaces it.
export async function setBudget(input: { categoryId: string; amount: string }): Promise<ActionResult> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const failed = { success: false, error: "Couldn't save the budget. Try again." };
  const { data: category, error: readError } = await supabase
    .from("finance_categories")
    .select("kind, is_active")
    .eq("id", parsed.data.categoryId)
    .maybeSingle();
  if (readError) {
    logError("setBudget (read)", readError);
    return failed;
  }
  if (!category) return { success: false, error: "That category no longer exists." };
  if (toKind(category.kind) !== "expense") return { success: false, error: "Budgets are for expense categories." };
  if (!category.is_active) return { success: false, error: "That category is archived." };

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, category_id: parsed.data.categoryId, amount_paise: parsed.data.amount, updated_at: now() },
      { onConflict: "user_id,category_id" }
    );
  if (error) {
    logError("setBudget", error);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

export async function removeBudget(categoryId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(categoryId);
  if (!parsed.success) return { success: false, error: "That budget no longer exists." };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("category_id", parsed.data);
  if (error) {
    logError("removeBudget", error);
    return { success: false, error: "Couldn't remove the budget. Try again." };
  }
  revalidateFinance();
  return { success: true };
}

// ── Recurring items ─────────────────────────────────────────────────────────────────

function recurringFields(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    kind: formData.get("kind") ?? "",
    amount: formData.get("amount") ?? "",
    accountId: formData.get("accountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    frequency: formData.get("frequency") ?? "",
    nextOn: formData.get("nextOn") ?? "",
  };
}

// The anchor day is the day of the next date given, on create and on every edit: that is
// the day of the month a monthly or yearly item keeps coming back to.
export async function createRecurring(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = recurringInputSchema.safeParse(recurringFields(formData));
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const failed = { success: false, error: "Couldn't add the recurring item. Try again." };
  const { problem, error: checkError } = await checkPicks(supabase, parsed.data, null);
  if (checkError) {
    logError("createRecurring (check)", checkError);
    return failed;
  }
  if (problem) return { success: false, error: problem };

  const { error } = await supabase
    .from("recurring_items")
    .insert({ user_id: userId, ...recurringToRow(parsed.data, anchorDayOf(parsed.data.nextOn)) });
  if (errorCode(error) === FOREIGN_KEY_VIOLATION) {
    return { success: false, error: "That account or category no longer exists." };
  }
  if (error) {
    logError("createRecurring", error);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

export async function updateRecurring(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = recurringUpdateSchema.safeParse({ id: formData.get("id"), ...recurringFields(formData) });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const failed = { success: false, error: "Couldn't save the recurring item. Try again." };
  const { data: current, error: readError } = await supabase
    .from("recurring_items")
    .select("account_id, category_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    logError("updateRecurring (read)", readError);
    return failed;
  }
  if (!current) return { success: false, error: "That recurring item no longer exists." };

  const { problem, error: checkError } = await checkPicks(supabase, parsed.data, {
    accountId: current.account_id,
    categoryId: current.category_id,
  });
  if (checkError) {
    logError("updateRecurring (check)", checkError);
    return failed;
  }
  if (problem) return { success: false, error: problem };

  const { error } = await supabase
    .from("recurring_items")
    .update({ ...recurringToRow(parsed.data, anchorDayOf(parsed.data.nextOn)), updated_at: now() })
    .eq("id", parsed.data.id);
  if (errorCode(error) === FOREIGN_KEY_VIOLATION) {
    return { success: false, error: "That account or category no longer exists." };
  }
  if (error) {
    logError("updateRecurring", error);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

// Transactions already logged from the item keep their rows; the foreign key clears
// their recurring_item_id.
export async function deleteRecurring(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That recurring item no longer exists." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("recurring_items").delete().eq("id", parsed.data).select("id").maybeSingle();
  if (error) {
    logError("deleteRecurring", error);
    return { success: false, error: "Couldn't delete the recurring item. Try again." };
  }
  if (!data) return { success: false, error: "That recurring item no longer exists." };
  revalidateFinance();
  return { success: true };
}

// Moves an item's next date on by one period, but only if it is still `from` — so a
// double click, or Log it in two tabs, advances it once. Returns the new date, or null
// when somebody else already moved it.
async function advanceRecurring(
  supabase: Client,
  item: { id: string; frequency: string; anchor_day: number; next_on: string }
): Promise<{ nextOn: string | null; error: unknown }> {
  const nextOn = nextOccurrence(toFrequency(item.frequency), item.anchor_day, item.next_on);
  const { data, error } = await supabase
    .from("recurring_items")
    .update({ next_on: nextOn, updated_at: now() })
    .eq("id", item.id)
    .eq("next_on", item.next_on)
    .select("id")
    .maybeSingle();
  return { nextOn: data ? nextOn : null, error };
}

async function readRecurring(supabase: Client, id: string) {
  return supabase
    .from("recurring_items")
    .select("id, kind, amount_paise, account_id, category_id, frequency, anchor_day, next_on")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
}

// Log it: records the item as a transaction dated its next date, then moves the next
// date on. The date moves first (guarded, see advanceRecurring) so it can't be logged
// twice; if the insert then fails, the date is put back.
export async function logRecurring(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That recurring item no longer exists." };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const failed = { success: false, error: "Couldn't log it. Try again." };
  const { data: item, error: readError } = await readRecurring(supabase, parsed.data);
  if (readError) {
    logError("logRecurring (read)", readError);
    return failed;
  }
  if (!item) return { success: false, error: "That recurring item no longer exists." };

  const { nextOn, error: advanceError } = await advanceRecurring(supabase, item);
  if (advanceError) {
    logError("logRecurring (advance)", advanceError);
    return failed;
  }
  if (!nextOn) return { success: false, error: "That was already logged." };

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    occurred_on: item.next_on,
    kind: item.kind,
    amount_paise: item.amount_paise,
    account_id: item.account_id,
    category_id: item.category_id,
    source: "recurring",
    recurring_item_id: item.id,
  });
  if (error) {
    logError("logRecurring (insert)", error);
    const { error: undoError } = await supabase
      .from("recurring_items")
      .update({ next_on: item.next_on, updated_at: now() })
      .eq("id", item.id)
      .eq("next_on", nextOn);
    if (undoError) logError("logRecurring (undo)", undoError);
    return failed;
  }
  revalidateFinance();
  return { success: true };
}

// Skip: moves the next date on without recording anything.
export async function skipRecurring(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "That recurring item no longer exists." };

  const supabase = await createClient();
  const failed = { success: false, error: "Couldn't skip it. Try again." };
  const { data: item, error: readError } = await readRecurring(supabase, parsed.data);
  if (readError) {
    logError("skipRecurring (read)", readError);
    return failed;
  }
  if (!item) return { success: false, error: "That recurring item no longer exists." };

  const { nextOn, error } = await advanceRecurring(supabase, item);
  if (error) {
    logError("skipRecurring", error);
    return failed;
  }
  if (!nextOn) return { success: false, error: "That was already skipped." };
  revalidateFinance();
  return { success: true };
}

// ── CSV import ──────────────────────────────────────────────────────────────────────

export type ImportSummary = { inserted: number; duplicatesLeftOut: number; unreadable: number };

type ExistingKey = { occurred_on: string; kind: string; amount_paise: number };

// Every transaction in one account between two dates, as the keys duplicate matching
// uses. Pages past PostgREST's 1,000-row cap.
async function readAccountKeys(
  supabase: Client,
  accountId: string,
  from: string,
  to: string
): Promise<{ keys: ExistingKey[]; error: unknown }> {
  const keys: ExistingKey[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, kind, amount_paise")
      .eq("account_id", accountId)
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("id")
      .range(start, start + 999);
    if (error) return { keys: [], error };
    keys.push(...(data ?? []));
    if ((data ?? []).length < 1000) return { keys, error: null };
  }
}

const rangeSchema = z.object({ accountId: z.uuid(), from: z.string().refine(isRealDate), to: z.string().refine(isRealDate) });

// For the import preview: the account's existing transactions over the file's dates,
// so the browser can flag possible duplicates before anything is sent. Only dates,
// kinds and amounts come back.
export async function importMatches(
  accountId: string,
  from: string,
  to: string
): Promise<ActionResult<{ occurredOn: string; kind: FinanceKind; amountPaise: number }[]>> {
  const parsed = rangeSchema.safeParse({ accountId, from, to });
  if (!parsed.success) return { success: false, error: "Pick an account." };

  const supabase = await createClient();
  const { keys, error } = await readAccountKeys(supabase, parsed.data.accountId, parsed.data.from, parsed.data.to);
  if (error) {
    logError("importMatches", error);
    return { success: false, error: "Couldn't check for duplicates. Try again." };
  }
  return {
    success: true,
    data: keys.map((row) => ({ occurredOn: row.occurred_on, kind: toKind(row.kind), amountPaise: row.amount_paise })),
  };
}

const importSchema = z.object({
  accountId: z.uuid("Pick an account."),
  rows: z.array(z.unknown()).min(1, "There are no rows to import.").max(CSV_MAX_ROWS, "That's more than 5,000 rows."),
  ticked: z.array(z.boolean()),
});

// Imports the rows the preview ticked into one account. The rows were mapped in the
// browser — the file itself never reaches the server — so each is validated again here,
// and possible duplicates are found again against a fresh read of the account (the
// preview's flags are only a preview). Ticked rows go in as one insert under one batch
// id, uncategorised; a ticked duplicate is imported, since ticking it is how a person
// says it isn't one. Returns how many went in, how many flagged duplicates were left
// out, and how many rows couldn't be read.
export async function importCsv(accountId: string, rows: CsvImportRow[], ticked: boolean[]): Promise<ActionResult<ImportSummary>> {
  const parsed = importSchema.safeParse({ accountId, rows, ticked });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  if (parsed.data.ticked.length !== parsed.data.rows.length) {
    return { success: false, error: "The preview is out of date. Go back and try again." };
  }

  const valid: { row: CsvImportRow; ticked: boolean }[] = [];
  let unreadable = 0;
  parsed.data.rows.forEach((raw, index) => {
    const row = csvImportRowSchema.safeParse(raw);
    if (row.success) valid.push({ row: row.data, ticked: parsed.data.ticked[index] });
    else unreadable += 1;
  });

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return NOT_LOGGED_IN;

  const failed = { success: false, error: "Couldn't import the file. Nothing was added. Try again." };
  const { data: account, error: accountError } = await supabase
    .from("finance_accounts")
    .select("id, is_active")
    .eq("id", parsed.data.accountId)
    .maybeSingle();
  if (accountError) {
    logError("importCsv (account)", accountError);
    return failed;
  }
  if (!account) return { success: false, error: "That account no longer exists." };
  if (!account.is_active) return { success: false, error: "That account is archived. Pick another." };

  if (valid.length === 0) return { success: true, data: { inserted: 0, duplicatesLeftOut: 0, unreadable } };

  const dates = valid.map(({ row }) => row.occurredOn).sort();
  const { keys: existing, error: existingError } = await readAccountKeys(
    supabase,
    account.id,
    dates[0],
    dates[dates.length - 1]
  );
  if (existingError) {
    logError("importCsv (existing)", existingError);
    return failed;
  }

  const flags = flagDuplicates(
    valid.map(({ row }) => row),
    existing.map((row) => ({ occurredOn: row.occurred_on, kind: toKind(row.kind), amountPaise: row.amount_paise }))
  );
  const duplicatesLeftOut = valid.filter((entry, index) => flags[index] && !entry.ticked).length;
  const toInsert = valid.filter((entry) => entry.ticked).map(({ row }) => row);
  if (toInsert.length === 0) return { success: true, data: { inserted: 0, duplicatesLeftOut, unreadable } };

  const batchId = crypto.randomUUID();
  const { error } = await supabase.from("transactions").insert(
    toInsert.map((row) => ({
      user_id: userId,
      account_id: account.id,
      occurred_on: row.occurredOn,
      kind: row.kind,
      amount_paise: row.amountPaise,
      note: row.note,
      category_id: null,
      source: "csv",
      import_batch_id: batchId,
    }))
  );
  if (error) {
    logError("importCsv (insert)", error);
    return failed;
  }
  revalidateFinance();
  return { success: true, data: { inserted: toInsert.length, duplicatesLeftOut, unreadable } };
}
