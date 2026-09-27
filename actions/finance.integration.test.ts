// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  archiveCategory,
  createAccount,
  createCategory,
  createRecurring,
  createTransaction,
  importCsv,
  logRecurring,
  setBudget,
  skipRecurring,
} from "@/actions/finance";
import { getBudgets, getOverview, listAccountsWithCounts, listRecurring, listTransactions } from "@/lib/queries/finance";
import { emptyAccountEmail, loadEnvLocal } from "@/e2e/load-env";
import type { Database } from "@/lib/types/database";

// Runs the Finance actions and queries against the real life-os-dev database, signed in
// as the e2e test accounts (see e2e/global-setup.ts). Skipped when .env.local has no
// credentials. Every account and category it creates is named with RUN, and everything
// is removed afterwards (transactions, recurring items and budgets first).

loadEnvLocal();

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => state.client) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Client = SupabaseClient<Database>;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const configured = Boolean(URL && ANON_KEY && EMAIL && PASSWORD);

const RUN = `fin-it-${Date.now().toString(36)}`;
const FOREIGN_KEY_VIOLATION = "23503";
// A month no other spec writes to, so sums are exact.
const MONTH = "2031-03";

async function signIn(email: string): Promise<{ client: Client; userId: string }> {
  const client = createSupabaseClient<Database>(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD! });
  if (error || !data.user) throw new Error(`Could not sign in as ${email} (run Playwright once to create it)`);
  return { client, userId: data.user.id };
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe.skipIf(!configured)("finance data layer against life-os-dev", { timeout: 30_000 }, () => {
  let me: Client;
  let myId: string;
  let other: Client;
  let otherId: string;

  const accounts: { client: () => Client; id: string }[] = [];
  const categories: { client: () => Client; id: string }[] = [];

  const asMe = () => {
    state.client = me;
  };

  async function myAccount(name: string): Promise<string> {
    asMe();
    const result = await createAccount({ name: `${RUN} ${name}` });
    expect(result.success).toBe(true);
    accounts.push({ client: () => me, id: result.data!.id });
    return result.data!.id;
  }

  async function myCategory(name: string, kind: "expense" | "income" = "expense"): Promise<string> {
    asMe();
    const result = await createCategory({ name: `${RUN} ${name}`, kind });
    expect(result.success).toBe(true);
    categories.push({ client: () => me, id: result.data!.id });
    return result.data!.id;
  }

  async function addTransaction(fields: Record<string, string>) {
    asMe();
    return createTransaction({ success: false }, form({ kind: "expense", occurredOn: `${MONTH}-10`, ...fields }));
  }

  beforeAll(async () => {
    ({ client: me, userId: myId } = await signIn(EMAIL!));
    ({ client: other, userId: otherId } = await signIn(emptyAccountEmail()));
  }, 30_000);

  afterAll(async () => {
    if (!me) return;
    for (const { client, id } of accounts) {
      await client().from("transactions").delete().eq("account_id", id);
      await client().from("recurring_items").delete().eq("account_id", id);
    }
    for (const { client, id } of categories) await client().from("budgets").delete().eq("category_id", id);
    for (const { client, id } of categories) await client().from("finance_categories").delete().eq("id", id);
    for (const { client, id } of accounts) await client().from("finance_accounts").delete().eq("id", id);
  }, 30_000);

  it("refuses a transaction pointing at another user's account or category (composite foreign key)", async () => {
    const mine = await myAccount("Mine");
    const { data: theirAccount } = await other
      .from("finance_accounts")
      .insert({ user_id: otherId, name: `${RUN} Theirs` })
      .select("id")
      .single();
    accounts.push({ client: () => other, id: theirAccount!.id });
    const { data: theirCategory } = await other
      .from("finance_categories")
      .insert({ user_id: otherId, name: `${RUN} Theirs` })
      .select("id")
      .single();
    categories.push({ client: () => other, id: theirCategory!.id });

    const row = { user_id: myId, occurred_on: `${MONTH}-01`, kind: "expense", amount_paise: 100 };
    const account = await me.from("transactions").insert({ ...row, account_id: theirAccount!.id });
    expect(account.error?.code).toBe(FOREIGN_KEY_VIOLATION);
    const category = await me
      .from("transactions")
      .insert({ ...row, account_id: mine, category_id: theirCategory!.id });
    expect(category.error?.code).toBe(FOREIGN_KEY_VIOLATION);

    // The action says so in words instead.
    expect(await addTransaction({ amount: "1", accountId: theirAccount!.id })).toEqual({
      success: false,
      error: "That account no longer exists.",
    });
  });

  it("a second user cannot read the first user's rows", async () => {
    const account = await myAccount("Private");
    const category = await myCategory("Private");
    expect(await addTransaction({ amount: "50", accountId: account, categoryId: category })).toEqual({ success: true });
    asMe();
    expect(await setBudget({ categoryId: category, amount: "100" })).toEqual({ success: true });

    const reads = await Promise.all([
      other.from("finance_accounts").select("id").eq("id", account),
      other.from("finance_categories").select("id").eq("id", category),
      other.from("transactions").select("id").eq("account_id", account),
      other.from("budgets").select("id").eq("category_id", category),
    ]);
    for (const { data, error } of reads) {
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
    // Signed in as me, the same reads see them.
    expect((await me.from("transactions").select("id").eq("account_id", account)).data).toHaveLength(1);
    // And can't change them either: an update through RLS touches nothing.
    const { data: updated } = await other.from("finance_accounts").update({ name: "hijacked" }).eq("id", account).select("id");
    expect(updated).toEqual([]);
  });

  it("checks picks: category kind must match, archived categories can't be newly chosen", async () => {
    const account = await myAccount("Picks");
    const income = await myCategory("Salary", "income");
    const archived = await myCategory("Old");
    asMe();
    expect(await archiveCategory(archived)).toMatchObject({ success: true });

    expect(await addTransaction({ amount: "10", accountId: account, categoryId: income })).toEqual({
      success: false,
      error: "Pick an expense category.",
    });
    expect(await addTransaction({ amount: "10", accountId: account, categoryId: archived })).toEqual({
      success: false,
      error: "That category is archived. Pick another.",
    });
    asMe();
    expect(await setBudget({ categoryId: income, amount: "10" })).toEqual({
      success: false,
      error: "Budgets are for expense categories.",
    });
  });

  it("overview, budgets, lists and counts add up in paise", async () => {
    const account = await myAccount("Sums");
    const food = await myCategory("Food");
    const rent = await myCategory("Rent");
    const salary = await myCategory("Pay", "income");
    await addTransaction({ amount: "640.50", accountId: account, categoryId: food, note: "Dinner" });
    await addTransaction({ amount: "5,000", accountId: account, categoryId: food });
    await addTransaction({ amount: "20000", accountId: account, categoryId: rent });
    await addTransaction({ amount: "300", accountId: account });
    await addTransaction({ kind: "income", amount: "85000", accountId: account, categoryId: salary });
    asMe();
    await setBudget({ categoryId: food, amount: "5000" });

    // Other test rows in this month belong to other accounts; scope sums to this run's.
    const { transactions, count } = await listTransactions(me, { month: MONTH, accountId: account });
    expect(count).toBe(5);
    expect(transactions[0].accountName).toBe(`${RUN} Sums`);
    expect((await listTransactions(me, { month: MONTH, accountId: account, categoryId: "none" })).count).toBe(1);
    expect((await listTransactions(me, { month: MONTH, accountId: account, kind: "income" })).count).toBe(1);

    const { overview } = await getOverview(me, MONTH);
    const foodLine = overview!.lines.find((line) => line.categoryId === food)!;
    expect(foodLine).toMatchObject({ spentPaise: 564050, budgetPaise: 500000, overByPaise: 64050, percent: 112 });

    const { budgets } = await getBudgets(me, MONTH);
    expect(budgets!.budgeted.find((line) => line.categoryId === food)?.spentPaise).toBe(564050);
    expect(budgets!.unbudgeted.find((line) => line.categoryId === rent)?.spentPaise).toBe(2000000);
    expect(budgets!.unbudgeted.some((line) => line.categoryId === salary)).toBe(false);

    const { accounts: split } = await listAccountsWithCounts(me);
    expect(split.active.find((a) => a.id === account)?.transactionCount).toBe(5);
  });

  it("Log it records a transaction on the next date and moves it on; Skip only moves it", async () => {
    const account = await myAccount("Recurring");
    const rent = await myCategory("Recurring rent");
    asMe();
    expect(
      await createRecurring(
        { success: false },
        form({
          name: `${RUN} Rent`,
          kind: "expense",
          amount: "20000",
          accountId: account,
          categoryId: rent,
          frequency: "monthly",
          nextOn: "2031-01-31",
        })
      )
    ).toEqual({ success: true });
    const { data: item } = await me.from("recurring_items").select("id, anchor_day").eq("account_id", account).single();
    expect(item!.anchor_day).toBe(31);

    const due = (await listRecurring(me, "2031-02-01")).items.find((row) => row.id === item!.id);
    expect(due?.due).toBe(true);

    expect(await logRecurring(item!.id)).toEqual({ success: true });
    const { data: logged } = await me
      .from("transactions")
      .select("occurred_on, source, recurring_item_id, amount_paise")
      .eq("account_id", account);
    expect(logged).toEqual([{ occurred_on: "2031-01-31", source: "recurring", recurring_item_id: item!.id, amount_paise: 2000000 }]);

    expect(await skipRecurring(item!.id)).toEqual({ success: true });
    const { data: after } = await me.from("recurring_items").select("next_on").eq("id", item!.id).single();
    expect(after!.next_on).toBe("2031-03-31");
    const { count } = await me.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", account);
    expect(count).toBe(1);
  });

  it("importCsv inserts the ticked rows under one batch and its counts match what went in", async () => {
    const account = await myAccount("Import");
    await addTransaction({ amount: "640", accountId: account, occurredOn: "2031-04-23" });

    const rows = [
      { occurredOn: "2031-04-23", kind: "expense" as const, amountPaise: 64000, note: "SWIGGY" }, // matches existing
      { occurredOn: "2031-04-22", kind: "expense" as const, amountPaise: 215000, note: "BIGBASKET" },
      { occurredOn: "2031-04-22", kind: "expense" as const, amountPaise: 215000, note: "BIGBASKET" }, // repeats the row above
      { occurredOn: "2031-04-15", kind: "income" as const, amountPaise: 11200050, note: null },
      { occurredOn: "2031-02-31", kind: "expense" as const, amountPaise: 100, note: null }, // unreadable
    ];
    // The preview's defaults: duplicates unticked. The in-file repeat is ticked anyway.
    const ticked = [false, true, true, true, true];

    asMe();
    const result = await importCsv(account, rows, ticked);
    expect(result).toEqual({ success: true, data: { inserted: 3, duplicatesLeftOut: 1, unreadable: 1 } });

    const { data } = await me
      .from("transactions")
      .select("source, import_batch_id, category_id, amount_paise")
      .eq("account_id", account)
      .eq("source", "csv");
    expect(data).toHaveLength(3);
    expect(new Set(data!.map((row) => row.import_batch_id)).size).toBe(1);
    expect(data!.every((row) => row.category_id === null)).toBe(true);
  });
});
