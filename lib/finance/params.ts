import { isMonth, monthOf, type FinanceKind } from "@/lib/finance/money";

// Finance's URL state (docs/04 §5: filters are search params). Anything malformed is
// ignored rather than an error: a bad ?month= shows this month.

type Params = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The month named in the URL, and the month to show (this month in the user's timezone
// when the URL names none).
export function monthParam(params: Params, today: string): { month: string; named: boolean } {
  const value = one(params.month);
  return isMonth(value) ? { month: value, named: true } : { month: monthOf(today), named: false };
}

export type TransactionParams = {
  month: string;
  named: boolean;
  account?: string;
  category?: string | "none";
  kind?: FinanceKind;
};

export function transactionParams(params: Params, today: string): TransactionParams {
  const account = one(params.account);
  const category = one(params.category);
  const kind = one(params.kind);
  return {
    ...monthParam(params, today),
    account: account && UUID.test(account) ? account : undefined,
    category: category === "none" || (category && UUID.test(category)) ? category : undefined,
    kind: kind === "income" || kind === "expense" ? kind : undefined,
  };
}

// /finance/transactions with the given filters; empty ones are left out.
export function transactionsHref(filters: Partial<Omit<TransactionParams, "named">>): string {
  const search = new URLSearchParams();
  if (filters.month) search.set("month", filters.month);
  if (filters.account) search.set("account", filters.account);
  if (filters.category) search.set("category", filters.category);
  if (filters.kind) search.set("kind", filters.kind);
  const query = search.toString();
  return `/finance/transactions${query ? `?${query}` : ""}`;
}
