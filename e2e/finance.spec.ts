import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test, expect, type Page } from "@playwright/test";
import { loadEnvLocal } from "./load-env";

// Stage 5b checkpoint on the hi-fi screens: every Finance tab, the CSV import wizard with
// both fixture files, and the Today Spending card. Each test works in its own uniquely
// named accounts and categories (made directly as the e2e account, RLS applying, where the
// screen under test isn't the one that makes them), so tests never read each other's
// rows. global-setup clears the Finance tables before a run.
loadEnvLocal();

test.describe.configure({ mode: "serial" });

// A generous timeout: dev mode compiles each route on its first hit.
const SLOW = { timeout: 20_000 };
const FIXTURES = path.join(__dirname, "fixtures");

async function signedInClient(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  if (error || !data.user) throw new Error(`finance.spec: sign-in failed: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

type Seed = { supabase: SupabaseClient; userId: string };

async function makeAccount({ supabase, userId }: Seed, name: string): Promise<string> {
  const { data, error } = await supabase.from("finance_accounts").insert({ user_id: userId, name }).select("id").single();
  if (error) throw new Error(`finance.spec: account: ${error.message}`);
  return data.id;
}

async function makeCategory({ supabase, userId }: Seed, name: string, kind = "expense"): Promise<string> {
  const { data, error } = await supabase
    .from("finance_categories")
    .insert({ user_id: userId, name, kind })
    .select("id")
    .single();
  if (error) throw new Error(`finance.spec: category: ${error.message}`);
  return data.id;
}

// Today in the account's timezone — what the screens use for "today" and "this month".
async function accountToday({ supabase }: Seed): Promise<string> {
  const { data } = await supabase.from("user_settings").select("timezone").maybeSingle();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: data?.timezone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function openSheet(page: Page, button: string, title: string) {
  await page.getByRole("button", { name: button }).first().click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible(SLOW);
  return dialog;
}

let seed: Seed;
const stamp = Date.now();

test.beforeAll(async () => {
  seed = await signedInClient();
});

test("Accounts: add, rename, archive and restore a label", async ({ page }) => {
  const name = `HDFC Savings ${stamp}`;
  await page.goto("/finance/accounts");
  await expect(page.getByText("Accounts are labels only")).toBeVisible(SLOW);

  await page.getByRole("button", { name: "Add account" }).first().click();
  await page.getByLabel("New account").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const row = page.locator('[data-slot="label-row"]', { hasText: name });
  await expect(row).toContainText("No transactions", SLOW);

  // A name that's taken (ignoring case) is refused before it's sent.
  await page.getByLabel("New account").fill(name.toUpperCase());
  await expect(page.getByText("already exists")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await row.getByRole("button", { name: `Rename ${name}` }).click();
  await page.getByRole("textbox", { name: `Rename ${name}` }).fill(`${name} renamed`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const renamed = page.locator('[data-slot="label-row"]', { hasText: `${name} renamed` });
  await expect(renamed).toBeVisible(SLOW);

  await renamed.getByRole("button", { name: `Archive ${name} renamed` }).click();
  await expect(renamed).toBeHidden(SLOW);
  await page.getByRole("button", { name: /^Archived \(\d+\)/ }).click();
  await page.getByRole("button", { name: `Restore ${name} renamed` }).click();
  await expect(page.locator('[data-slot="label-row"]', { hasText: `${name} renamed` })).toBeVisible(SLOW);
});

test("Categories: an income category carries the Income tag", async ({ page }) => {
  await page.goto("/finance/categories");
  await page.getByRole("button", { name: "Add category" }).first().click();
  await page.getByLabel("New category").fill(`Freelance ${stamp}`);
  await page.getByRole("group", { name: "Type" }).getByRole("button", { name: "Income" }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator('[data-slot="label-row"]', { hasText: `Freelance ${stamp}` })).toContainText("Income", SLOW);

  await page.getByLabel("New category").fill(`Groceries ${stamp}`);
  await page.getByRole("group", { name: "Type" }).getByRole("button", { name: "Expense" }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const groceries = page.locator('[data-slot="label-row"]', { hasText: `Groceries ${stamp}` });
  await expect(groceries).toBeVisible(SLOW);
  await expect(groceries).not.toContainText("Income");
});

test("Transactions: add, filter, edit and delete, with signed amounts", async ({ page }) => {
  const account = `Wallet ${stamp}`;
  await makeAccount(seed, account);
  await makeCategory(seed, `Food ${stamp}`);
  await makeCategory(seed, `Salary ${stamp}`, "income");

  await page.goto("/finance/transactions");
  let dialog = await openSheet(page, "Add transaction", "Add transaction");
  await dialog.getByLabel("Amount").fill("640.50");
  await dialog.getByLabel("Account").selectOption({ label: account });
  await dialog.getByLabel("Category").selectOption({ label: `Food ${stamp}` });
  await dialog.getByLabel("Note (optional)").fill(`Swiggy dinner ${stamp}`);
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden(SLOW);

  // Income: the picker only offers income categories once Income is chosen.
  dialog = await openSheet(page, "Add transaction", "Add transaction");
  await dialog.getByRole("group", { name: "Type" }).getByRole("button", { name: "Income" }).click();
  await expect(dialog.getByLabel("Category").locator("option", { hasText: `Food ${stamp}` })).toHaveCount(0);
  await dialog.getByLabel("Amount").fill("0");
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog.getByText("Enter an amount above zero.")).toBeVisible();
  await dialog.getByLabel("Amount").fill("1,24,530");
  await dialog.getByLabel("Account").selectOption({ label: account });
  await dialog.getByLabel("Category").selectOption({ label: `Salary ${stamp}` });
  await dialog.getByLabel("Note (optional)").fill(`Salary ${stamp}`);
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden(SLOW);

  // One without a category shows Uncategorised.
  dialog = await openSheet(page, "Add transaction", "Add transaction");
  await dialog.getByLabel("Amount").fill("100");
  await dialog.getByLabel("Account").selectOption({ label: account });
  await dialog.getByLabel("Note (optional)").fill(`Parking ${stamp}`);
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden(SLOW);

  await page.getByLabel("Account", { exact: true }).selectOption({ label: account });
  await expect(page).toHaveURL(/account=/, SLOW);
  const rows = page.locator('[data-slot="transaction-row"]');
  await expect(rows).toHaveCount(3, SLOW);
  await expect(page.locator('[data-slot="transaction-count"]')).toHaveText("3 transactions");
  await expect(rows.filter({ hasText: `Swiggy dinner ${stamp}` })).toContainText("−₹640.50");
  const salary = rows.filter({ hasText: `Salary ${stamp}` });
  await expect(salary).toContainText("+₹1,24,530");
  // Income is teal-ink text.
  await expect(salary.getByText("+₹1,24,530")).toHaveClass(/text-teal-ink/);
  await expect(rows.filter({ hasText: `Parking ${stamp}` })).toContainText("Uncategorised");

  await page.getByRole("group", { name: "Type" }).getByRole("button", { name: "Income" }).click();
  await expect(page).toHaveURL(/kind=income/, SLOW);
  await expect(rows).toHaveCount(1, SLOW);
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "Uncategorised" });
  await expect(page.getByText("No transactions here")).toBeVisible(SLOW);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/kind=/, SLOW);

  // Edit the amount, then delete, which asks once.
  await page.getByLabel("Account", { exact: true }).selectOption({ label: account });
  await expect(rows).toHaveCount(3, SLOW);
  await page.getByRole("button", { name: `Edit Swiggy dinner ${stamp}` }).click();
  dialog = page.getByRole("dialog", { name: "Edit transaction" });
  await dialog.getByLabel("Amount").fill("700");
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden(SLOW);
  await expect(rows.filter({ hasText: `Swiggy dinner ${stamp}` })).toContainText("−₹700", SLOW);

  await page.getByRole("button", { name: `Edit Parking ${stamp}` }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(dialog.getByText("Delete this transaction?")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete transaction" }).click();
  await expect(dialog).toBeHidden(SLOW);
  await expect(rows).toHaveCount(2, SLOW);
});

test("Budgets and Overview: set, edit in place, over budget written out, remove", async ({ page }) => {
  const today = await accountToday(seed);
  const accountId = await makeAccount(seed, `Card ${stamp}`);
  const eating = `Eating out ${stamp}`;
  const eatingId = await makeCategory(seed, eating);
  const shopping = `Shopping ${stamp}`;
  const shoppingId = await makeCategory(seed, shopping);
  const { error } = await seed.supabase.from("transactions").insert([
    { user_id: seed.userId, account_id: accountId, category_id: eatingId, kind: "expense", amount_paise: 640000, occurred_on: today },
    { user_id: seed.userId, account_id: accountId, category_id: shoppingId, kind: "expense", amount_paise: 120000, occurred_on: today },
  ]);
  expect(error).toBeNull();

  await page.goto("/finance/budgets");
  const row = page.locator('[data-slot="budget-row"]', { hasText: eating });
  await expect(row).toContainText("No budget", SLOW);
  await row.getByRole("button", { name: `Set budget for ${eating}` }).click();
  await page.getByLabel(`Monthly budget for ${eating}`).fill("5000");
  await page.getByLabel(`Monthly budget for ${eating}`).press("Enter");
  await expect(row).toContainText("128%", SLOW);
  await expect(row.locator('[data-slot="over-tag"]')).toHaveText("Over by ₹1,400");

  // Edit in place: raise it past the spend and the excess goes.
  await page.getByLabel(`Monthly budget for ${eating}`).fill("8000");
  await page.getByLabel(`Monthly budget for ${eating}`).press("Enter");
  await expect(row).toContainText("80%", SLOW);
  await expect(row.locator('[data-slot="over-tag"]')).toHaveCount(0);
  await page.getByLabel(`Monthly budget for ${eating}`).fill("5000");
  await page.getByLabel(`Monthly budget for ${eating}`).press("Enter");
  await expect(row).toContainText("128%", SLOW);

  await page.goto("/finance/overview");
  const line = page.locator('[data-slot="overview-line"]', { hasText: eating });
  await expect(line).toContainText("₹6,400 of ₹5,000", SLOW);
  await expect(line).toContainText("Over by ₹1,400");
  await expect(page.getByText("Other · no budget")).toBeVisible();

  // Next month has none of it.
  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page).toHaveURL(/month=/, SLOW);
  await expect(page.locator('[data-slot="overview-line"]', { hasText: eating })).toContainText("₹0 of ₹5,000", SLOW);

  await page.goto("/finance/budgets");
  await row.getByRole("button", { name: `Remove budget for ${eating}` }).click();
  await expect(row).toContainText("No budget", SLOW);
});

test("Recurring: add an item due today, Log it, Skip, and delete", async ({ page }) => {
  const account = `Savings ${stamp}`;
  await makeAccount(seed, account);
  await makeCategory(seed, `Bills ${stamp}`);
  const name = `Internet bill ${stamp}`;

  await page.goto("/finance/recurring");
  const dialog = await openSheet(page, "Add recurring item", "Add recurring item");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Amount").fill("999");
  await dialog.getByLabel("Category").selectOption({ label: `Bills ${stamp}` });
  await dialog.getByLabel("Account").selectOption({ label: account });
  await dialog.getByLabel("How often").selectOption("weekly");
  // Next date defaults to today, so it's due straight away.
  await dialog.getByRole("button", { name: "Save recurring item" }).click();
  await expect(dialog).toBeHidden(SLOW);

  const row = page.locator('[data-slot="recurring-row"]', { hasText: name });
  await expect(row).toContainText("Due", SLOW);
  await expect(row).toContainText("−₹999");
  await row.getByRole("button", { name: `Log ${name}` }).click();
  await expect(row.getByText("Due", { exact: true })).toBeHidden(SLOW);

  await page.goto("/finance/transactions");
  await page.getByLabel("Account", { exact: true }).selectOption({ label: account });
  await expect(page.locator('[data-slot="transaction-row"]')).toHaveCount(1, SLOW);

  // Skip needs it due again: move it back to today directly, then skip.
  const today = await accountToday(seed);
  await seed.supabase.from("recurring_items").update({ next_on: today }).eq("name", name);
  await page.goto("/finance/recurring");
  await row.getByRole("button", { name: `Skip ${name}` }).click();
  await expect(row.getByText("Due", { exact: true })).toBeHidden(SLOW);
  const { count } = await seed.supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .not("recurring_item_id", "is", null)
    .eq("occurred_on", today);
  expect(count).toBeGreaterThanOrEqual(1);

  await row.getByRole("button", { name: `Edit ${name}` }).click();
  const edit = page.getByRole("dialog", { name: "Edit recurring item" });
  await edit.getByRole("button", { name: "Delete" }).click();
  await edit.getByRole("button", { name: "Delete recurring item" }).click();
  await expect(edit).toBeHidden(SLOW);
  await expect(row).toHaveCount(0, SLOW);
});

test("CSV import: signed Amount file, with an existing and an in-file duplicate and an unreadable row", async ({ page }) => {
  const account = `HDFC import ${stamp}`;
  const accountId = await makeAccount(seed, account);
  // Already in the account: the second BIGBASKET line's twin.
  await seed.supabase.from("transactions").insert({
    user_id: seed.userId,
    account_id: accountId,
    kind: "expense",
    amount_paise: 215000,
    occurred_on: "2026-09-22",
    note: "Bigbasket order",
  });

  await page.goto("/finance/import");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("CSV file").setInputFiles(path.join(FIXTURES, "finance-signed-amount.csv"));
  await expect(page.locator('[data-slot="csv-file"]')).toContainText("7 rows · 4 columns", SLOW);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Import into account").selectOption({ label: account });
  await expect(page.getByLabel("Date format")).toHaveValue("DD/MM/YYYY");
  await expect(page.getByLabel("Map Amount")).toHaveValue("amount");
  await expect(page.getByLabel("Map Balance")).toHaveValue("ignore");
  await expect(page.getByText("1,24,530.10, 1,25,170.10")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  const rows = page.locator('[data-slot="preview-row"]');
  await expect(rows).toHaveCount(6, SLOW);
  await expect(rows.filter({ hasText: "Possible duplicate" })).toHaveCount(2);
  await expect(page.locator('[data-slot="preview-row"][data-status="unreadable"]')).toContainText("Date isn’t DD/MM/YYYY");
  await expect(page.locator('[data-slot="preview-row"][data-status="duplicate"]').getByRole("checkbox").first()).not.toBeChecked();
  await expect(rows.filter({ hasText: "FREELANCE PAYMENT" })).toContainText("+₹1,12,000.50");

  // Tick the in-file repeat to import it anyway.
  await page.locator('[data-slot="preview-row"][data-status="duplicate"]').nth(1).getByRole("checkbox").click();
  await page.getByRole("button", { name: "Import 4 transactions" }).click();
  await expect(page.getByText("4 transactions imported")).toBeVisible(SLOW);
  await expect(page.getByText("1 possible duplicate was left out.")).toBeVisible();

  await page.getByRole("link", { name: "View transactions" }).click();
  await expect(page).toHaveURL(/month=2026-09/, SLOW);
  await expect(page.locator('[data-slot="transaction-row"]')).toHaveCount(5, SLOW);
  await expect(page.locator('[data-slot="transaction-row"]', { hasText: "SWIGGY BLR" })).toContainText("Uncategorised");
});

test("CSV import: Debit and Credit file, then Import another file", async ({ page }) => {
  const account = `Cash import ${stamp}`;
  await makeAccount(seed, account);

  await page.goto("/finance/import");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("CSV file").setInputFiles(path.join(FIXTURES, "finance-debit-credit.csv"));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Import into account").selectOption({ label: account });
  await expect(page.getByRole("checkbox", { name: /Debit and Credit/ })).toBeChecked();
  await expect(page.getByLabel("Date format")).toHaveValue("DD-MM-YYYY");
  await expect(page.getByLabel("Map Debit")).toHaveValue("debit");
  await expect(page.getByLabel("Map Credit")).toHaveValue("credit");
  await page.getByRole("button", { name: "Continue" }).click();

  const rows = page.locator('[data-slot="preview-row"]');
  await expect(rows).toHaveCount(5, SLOW);
  await expect(rows.filter({ hasText: "Possible duplicate" })).toHaveCount(1);
  await expect(page.locator('[data-slot="preview-row"][data-status="unreadable"]')).toContainText("Amount isn’t a number");
  await expect(rows.filter({ hasText: "SALARY SEP" })).toContainText("+₹1,73,000");
  await expect(rows.filter({ hasText: "ELECTRICITY BILL" })).toContainText("−₹1,850");

  await page.getByRole("button", { name: "Import 3 transactions" }).click();
  await expect(page.getByText("3 transactions imported")).toBeVisible(SLOW);
  await expect(page.getByText("1 row couldn’t be read.")).toBeVisible();

  await page.getByRole("button", { name: "Import another file" }).click();
  await expect(page.getByText("Drop a CSV file here")).toBeVisible();
});

test("CSV import: a 5,000-row file goes in whole (the mapped rows pass 1 MB)", async ({ page }) => {
  test.setTimeout(120_000);
  const account = `Bulk import ${stamp}`;
  await makeAccount(seed, account);
  // Distinct amounts so nothing is a possible duplicate; long narrations like real statements.
  const lines = ["Date,Narration,Amount"];
  for (let i = 1; i <= 5000; i++) {
    lines.push(`15/08/2026,UPI-${String(i).padStart(5, "0")}-${"MERCHANT PAYMENT REFERENCE ".repeat(6)},-${i}.25`);
  }

  await page.goto("/finance/import");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("CSV file").setInputFiles({
    name: "bulk.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n"), "utf8"),
  });
  await expect(page.locator('[data-slot="csv-file"]')).toContainText("5,000 rows", SLOW);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Import into account").selectOption({ label: account });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Import 5,000 transactions" }).click();
  await expect(page.getByText("5,000 transactions imported")).toBeVisible({ timeout: 60_000 });

  const { data: accountRow } = await seed.supabase.from("finance_accounts").select("id").eq("name", account).single();
  const { count } = await seed.supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountRow!.id);
  expect(count).toBe(5000);
});

test("the Today Spending card shows budgeted spend and links to Finance", async ({ page }) => {
  const today = await accountToday(seed);
  const accountId = await makeAccount(seed, `Today card ${stamp}`);
  const categoryId = await makeCategory(seed, `Takeaway ${stamp}`);
  await seed.supabase.from("budgets").insert({ user_id: seed.userId, category_id: categoryId, amount_paise: 100 });
  await seed.supabase.from("transactions").insert({
    user_id: seed.userId,
    account_id: accountId,
    category_id: categoryId,
    kind: "expense",
    amount_paise: 99_999_900,
    occurred_on: today,
  });

  await page.goto("/today");
  const card = page.getByRole("region", { name: "Spending this month" });
  await expect(card).toBeVisible(SLOW);
  await expect(card).toContainText(/of ₹[\d,]+ budgeted · \w+/);
  // The biggest overspend of any test's budgets: ₹9,99,998 over.
  await expect(card).toContainText(`Takeaway ${stamp} ₹9,99,998 over`);
  await card.getByRole("link", { name: "Finance" }).click();
  await expect(page).toHaveURL("/finance/overview", SLOW);
});

test.describe("an account with no Finance data", () => {
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("has an empty Spending card on Today, and empty states on every tab", async ({ page }) => {
    await page.goto("/today");
    const card = page.getByRole("region", { name: "Spending this month" });
    await expect(card).toBeVisible(SLOW);
    await expect(card).toContainText("No spending tracked yet.");

    for (const [tab, title] of [
      ["transactions", "No transactions here"],
      ["budgets", "No budgets set"],
      ["recurring", "No recurring items"],
      ["accounts", "No accounts yet"],
      ["categories", "No categories yet"],
    ] as const) {
      await page.goto(`/finance/${tab}`);
      await expect(page.getByText(title)).toBeVisible(SLOW);
    }
  });
});
