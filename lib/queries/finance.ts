import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import { budgetStatus, monthOf, monthRange, type FinanceKind } from "@/lib/finance/money";
import type { Database } from "@/lib/types/database";
import {
  ACCOUNT_COLUMNS,
  accountFromRow,
  CATEGORY_COLUMNS,
  categoryFromRow,
  RECURRING_COLUMNS,
  recurringFromRow,
  toKind,
  TRANSACTION_COLUMNS,
  transactionFromRow,
  type Account,
  type Category,
  type RecurringItem,
  type Transaction,
} from "@/lib/validations/finance";

// Read helpers for the Finance tabs and Today's Spending card. Each takes the caller's
// Supabase client, so RLS scopes every read to their own rows. A failed read is logged
// with a static context — never an amount, a note or an account or category name — and
// comes back as `error: true`. Sums are done here on whole paise: PostgREST aggregates
// are off on these projects, and a month of one person's transactions is small.

type Client = SupabaseClient<Database>;

// PostgREST returns at most 1,000 rows a request; reads that must see every row page
// through in blocks of that size.
const PAGE = 1000;

async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: [], error };
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return { data: rows, error: null };
  }
}

// ── Accounts and categories ──────────────────────────────────────────────────────────

export type LabelWithCount<T> = T & { transactionCount: number };

type Split<T> = { active: T[]; archived: T[] };

function splitByActive<T extends { isActive: boolean; name: string }>(items: T[]): Split<T> {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return { active: sorted.filter((item) => item.isActive), archived: sorted.filter((item) => !item.isActive) };
}

// The embedded `transactions(count)` is one grouped count per row, in the same request.
function countOf(value: unknown): number {
  return Array.isArray(value) && typeof value[0]?.count === "number" ? value[0].count : 0;
}

export async function listAccountsWithCounts(
  supabase: Client
): Promise<{ accounts: Split<LabelWithCount<Account>>; error: boolean }> {
  const { data, error } = await supabase.from("finance_accounts").select(`${ACCOUNT_COLUMNS}, transactions(count)`);
  if (error) {
    logError("Load finance accounts", error);
    return { accounts: { active: [], archived: [] }, error: true };
  }
  const accounts = (data ?? []).map((row) => ({ ...accountFromRow(row), transactionCount: countOf(row.transactions) }));
  return { accounts: splitByActive(accounts), error: false };
}

export async function listCategoriesWithCounts(
  supabase: Client
): Promise<{ categories: Split<LabelWithCount<Category>>; error: boolean }> {
  const { data, error } = await supabase
    .from("finance_categories")
    .select(`${CATEGORY_COLUMNS}, transactions(count)`);
  if (error) {
    logError("Load finance categories", error);
    return { categories: { active: [], archived: [] }, error: true };
  }
  const categories = (data ?? []).map((row) => ({
    ...categoryFromRow(row),
    transactionCount: countOf(row.transactions),
  }));
  return { categories: splitByActive(categories), error: false };
}

// Every account and category, archived included, for the filters and the sheets (which
// offer only active ones, plus whatever the item being edited already uses).
export async function listLabels(
  supabase: Client
): Promise<{ accounts: Account[]; categories: Category[]; error: boolean }> {
  const [accounts, categories] = await Promise.all([
    supabase.from("finance_accounts").select(ACCOUNT_COLUMNS).order("name"),
    supabase.from("finance_categories").select(CATEGORY_COLUMNS).order("name"),
  ]);
  if (accounts.error || categories.error) {
    logError("Load finance labels", accounts.error ?? categories.error);
    return { accounts: [], categories: [], error: true };
  }
  return {
    accounts: (accounts.data ?? []).map(accountFromRow),
    categories: (categories.data ?? []).map(categoryFromRow),
    error: false,
  };
}

// ── Month totals, shared by Overview, Budgets and the Today card ─────────────────────

type MonthRow = { kind: string; amount_paise: number; category_id: string | null };

function monthTransactions(supabase: Client, month: string) {
  const { start, end } = monthRange(month);
  return readAll<MonthRow>((from, to) =>
    supabase
      .from("transactions")
      .select("kind, amount_paise, category_id")
      .gte("occurred_on", start)
      .lte("occurred_on", end)
      .order("id")
      .range(from, to)
  );
}

type MonthTotals = { income: number; spending: number; spentByCategory: Map<string, number> };

function totalsOf(rows: MonthRow[]): MonthTotals {
  const totals: MonthTotals = { income: 0, spending: 0, spentByCategory: new Map() };
  for (const row of rows) {
    if (toKind(row.kind) === "income") {
      totals.income += row.amount_paise;
      continue;
    }
    totals.spending += row.amount_paise;
    if (row.category_id) {
      totals.spentByCategory.set(row.category_id, (totals.spentByCategory.get(row.category_id) ?? 0) + row.amount_paise);
    }
  }
  return totals;
}

export type BudgetLine = {
  categoryId: string;
  name: string;
  budgetPaise: number;
  spentPaise: number;
  percent: number;
  fill: number;
  overByPaise: number;
};

function budgetLine(categoryId: string, name: string, budgetPaise: number, spentPaise: number): BudgetLine {
  return { categoryId, name, budgetPaise, spentPaise, ...budgetStatus(spentPaise, budgetPaise) };
}

type BudgetRow = {
  category_id: string;
  amount_paise: number;
  finance_categories: { name: string; kind: string; is_active: boolean } | null;
};

// Budgets that count: those on active expense categories (the ones the Budgets tab lists).
function activeBudgets(rows: BudgetRow[]) {
  return rows.filter(
    (row) => row.finance_categories?.is_active && toKind(row.finance_categories.kind) === "expense"
  );
}

function readBudgets(supabase: Client) {
  return supabase
    .from("budgets")
    .select("category_id, amount_paise, finance_categories(name, kind, is_active)")
    .returns<BudgetRow[]>();
}

// ── Overview ────────────────────────────────────────────────────────────────────────

export type Overview = {
  income: number;
  spending: number;
  totalBudget: number;
  budgetedSpent: number;
  lines: BudgetLine[];
  otherSpent: number; // spending in categories without a budget, and uncategorised
};

// Two reads: the month's transactions and the budgets (with their category names).
export async function getOverview(supabase: Client, month: string): Promise<{ overview: Overview | null; error: boolean }> {
  const [transactions, budgets] = await Promise.all([monthTransactions(supabase, month), readBudgets(supabase)]);
  if (transactions.error || budgets.error) {
    logError("Load finance overview", transactions.error ?? budgets.error);
    return { overview: null, error: true };
  }

  const totals = totalsOf(transactions.data);
  const lines = activeBudgets(budgets.data ?? [])
    .map((row) =>
      budgetLine(row.category_id, row.finance_categories!.name, row.amount_paise, totals.spentByCategory.get(row.category_id) ?? 0)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalBudget = lines.reduce((sum, line) => sum + line.budgetPaise, 0);
  const budgetedSpent = lines.reduce((sum, line) => sum + line.spentPaise, 0);

  return {
    overview: {
      income: totals.income,
      spending: totals.spending,
      totalBudget,
      budgetedSpent,
      lines,
      otherSpent: totals.spending - budgetedSpent,
    },
    error: false,
  };
}

// ── Budgets ─────────────────────────────────────────────────────────────────────────

export type BudgetsView = {
  budgeted: BudgetLine[];
  unbudgeted: { categoryId: string; name: string; spentPaise: number }[];
  totalBudget: number;
  totalSpent: number; // spent in budgeted categories
};

// Active expense categories, each with its budget if it has one, and this month's spend.
export async function getBudgets(supabase: Client, month: string): Promise<{ budgets: BudgetsView | null; error: boolean }> {
  const [categories, transactions] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("id, name, budgets(amount_paise)")
      .eq("kind", "expense")
      .eq("is_active", true)
      .order("name"),
    monthTransactions(supabase, month),
  ]);
  if (categories.error || transactions.error) {
    logError("Load finance budgets", categories.error ?? transactions.error);
    return { budgets: null, error: true };
  }

  const { spentByCategory } = totalsOf(transactions.data);
  const view: BudgetsView = { budgeted: [], unbudgeted: [], totalBudget: 0, totalSpent: 0 };
  for (const category of categories.data ?? []) {
    const spent = spentByCategory.get(category.id) ?? 0;
    // budgets_user_category_key makes this embed one-to-one, so PostgREST returns the row
    // itself (or null), not the array the generated types describe.
    const embedded = category.budgets as unknown as { amount_paise: number } | { amount_paise: number }[] | null;
    const budget = Array.isArray(embedded) ? embedded[0]?.amount_paise : embedded?.amount_paise;
    if (budget === undefined) {
      view.unbudgeted.push({ categoryId: category.id, name: category.name, spentPaise: spent });
    } else {
      view.budgeted.push(budgetLine(category.id, category.name, budget, spent));
      view.totalBudget += budget;
      view.totalSpent += spent;
    }
  }
  return { budgets: view, error: false };
}

// ── Transactions ────────────────────────────────────────────────────────────────────

export type TransactionFilters = {
  month: string;
  accountId?: string;
  categoryId?: string | "none"; // "none": uncategorised only
  kind?: FinanceKind;
};

export type TransactionRow = Transaction & {
  accountName: string;
  accountArchived: boolean;
  categoryName: string | null;
  categoryArchived: boolean;
};

// The list shows up to this many rows; the count is always the full one.
export const TRANSACTION_LIST_LIMIT = 500;

type TransactionListRow = Database["public"]["Tables"]["transactions"]["Row"] & {
  finance_accounts: { name: string; is_active: boolean } | null;
  finance_categories: { name: string; is_active: boolean } | null;
};

export async function listTransactions(
  supabase: Client,
  filters: TransactionFilters
): Promise<{ transactions: TransactionRow[]; count: number; error: boolean }> {
  const { start, end } = monthRange(filters.month);
  let query = supabase
    .from("transactions")
    .select(`${TRANSACTION_COLUMNS}, finance_accounts(name, is_active), finance_categories(name, is_active)`, {
      count: "exact",
    })
    .gte("occurred_on", start)
    .lte("occurred_on", end);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId === "none") query = query.is("category_id", null);
  else if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.kind) query = query.eq("kind", filters.kind);

  const { data, count, error } = await query
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(TRANSACTION_LIST_LIMIT)
    .returns<TransactionListRow[]>();

  if (error) {
    logError("Load transactions", error);
    return { transactions: [], count: 0, error: true };
  }
  const transactions = (data ?? []).map((row) => ({
    ...transactionFromRow(row),
    accountName: row.finance_accounts?.name ?? "",
    accountArchived: row.finance_accounts ? !row.finance_accounts.is_active : false,
    categoryName: row.finance_categories?.name ?? null,
    categoryArchived: row.finance_categories ? !row.finance_categories.is_active : false,
  }));
  return { transactions, count: count ?? transactions.length, error: false };
}

// ── Recurring ───────────────────────────────────────────────────────────────────────

export type RecurringRow = RecurringItem & {
  accountName: string;
  categoryName: string;
  due: boolean;
};

type RecurringListRow = Database["public"]["Tables"]["recurring_items"]["Row"] & {
  finance_accounts: { name: string } | null;
  finance_categories: { name: string } | null;
};

// Active items, soonest first; an item is due once its next date is today or earlier.
export async function listRecurring(
  supabase: Client,
  today: string
): Promise<{ items: RecurringRow[]; error: boolean }> {
  const { data, error } = await supabase
    .from("recurring_items")
    .select(`${RECURRING_COLUMNS}, finance_accounts(name), finance_categories(name)`)
    .eq("is_active", true)
    .order("next_on")
    .order("name")
    .returns<RecurringListRow[]>();
  if (error) {
    logError("Load recurring items", error);
    return { items: [], error: true };
  }
  return {
    items: (data ?? []).map((row) => ({
      ...recurringFromRow(row),
      accountName: row.finance_accounts?.name ?? "",
      categoryName: row.finance_categories?.name ?? "",
      due: row.next_on <= today,
    })),
    error: false,
  };
}

// ── Today card ──────────────────────────────────────────────────────────────────────

export type TodaySpending = {
  month: string;
  spending: number;
  budgetedSpent: number;
  totalBudget: number;
  mostOver: { name: string; overByPaise: number } | null;
};

// Null when there is nothing to show: no budgets and no transactions this month.
export async function getTodaySpending(
  supabase: Client,
  today: string
): Promise<{ spending: TodaySpending | null; error: boolean }> {
  const month = monthOf(today);
  const [transactions, budgets] = await Promise.all([monthTransactions(supabase, month), readBudgets(supabase)]);
  if (transactions.error || budgets.error) {
    logError("Load today spending", transactions.error ?? budgets.error);
    return { spending: null, error: true };
  }

  const lines = activeBudgets(budgets.data ?? []);
  if (lines.length === 0 && transactions.data.length === 0) return { spending: null, error: false };

  const totals = totalsOf(transactions.data);
  let budgetedSpent = 0;
  let totalBudget = 0;
  let mostOver: TodaySpending["mostOver"] = null;
  for (const row of lines) {
    const spent = totals.spentByCategory.get(row.category_id) ?? 0;
    budgetedSpent += spent;
    totalBudget += row.amount_paise;
    const over = spent - row.amount_paise;
    if (over > 0 && (!mostOver || over > mostOver.overByPaise)) {
      mostOver = { name: row.finance_categories!.name, overByPaise: over };
    }
  }
  return { spending: { month, spending: totals.spending, budgetedSpent, totalBudget, mostOver }, error: false };
}
