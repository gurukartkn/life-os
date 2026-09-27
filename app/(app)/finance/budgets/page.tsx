import { BudgetsView } from "@/components/finance/budgets-view";
import { todayIso } from "@/lib/dates";
import { monthParam } from "@/lib/finance/params";
import { getBudgets } from "@/lib/queries/finance";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinanceBudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const today = todayIso(await getUserTimezone(supabase));
  const { month, named } = monthParam(await searchParams, today);
  const { budgets, error } = await getBudgets(supabase, month);
  return <BudgetsView month={month} named={named} budgets={budgets} loadError={error} />;
}
