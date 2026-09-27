import { TransactionsView } from "@/components/finance/transactions-view";
import { todayIso } from "@/lib/dates";
import { monthOf } from "@/lib/finance/money";
import { transactionParams } from "@/lib/finance/params";
import { listLabels, listTransactions, TRANSACTION_LIST_LIMIT } from "@/lib/queries/finance";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinanceTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const today = todayIso(await getUserTimezone(supabase));
  const filters = transactionParams(await searchParams, today);
  const [list, labels] = await Promise.all([
    listTransactions(supabase, {
      month: filters.month,
      accountId: filters.account,
      categoryId: filters.category,
      kind: filters.kind,
    }),
    listLabels(supabase),
  ]);

  return (
    <TransactionsView
      filters={filters}
      thisMonth={monthOf(today)}
      today={today}
      transactions={list.transactions}
      count={list.count}
      shownLimit={TRANSACTION_LIST_LIMIT}
      accounts={labels.accounts}
      categories={labels.categories}
      loadError={list.error || labels.error}
    />
  );
}
