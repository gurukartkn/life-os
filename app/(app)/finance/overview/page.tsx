import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { FinanceHeader, MonthSwitcher } from "@/components/finance/finance-header";
import { OverTag, SpendBar } from "@/components/finance/money";
import { EmptyState } from "@/components/ui/empty-state";
import { RetryButton } from "@/components/ui/retry-button";
import { todayIso } from "@/lib/dates";
import { formatInr } from "@/lib/finance/money";
import { monthParam } from "@/lib/finance/params";
import { getOverview, type Overview } from "@/lib/queries/finance";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function Stat({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: "pink" }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-100 p-4" data-slot="finance-stat">
      <p className="text-caption text-ink-muted">{label}</p>
      <p className={cn("text-stat-xl", tone === "pink" ? "text-pink-ink" : "text-ink")}>{value}</p>
      <p className="text-caption text-ink-muted">{caption}</p>
    </div>
  );
}

function Breakdown({ overview, month }: { overview: Overview; month: string }) {
  return (
    <section
      aria-labelledby="spend-by-category"
      className="flex flex-col gap-1 rounded-lg border border-border bg-surface-100 p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="spend-by-category" className="text-heading text-ink">
          Spending vs budget by category
        </h2>
        <p className="text-caption text-ink-muted">Only categories with a budget; the rest is grouped as Other.</p>
      </div>
      {overview.lines.length === 0 ? (
        <p className="border-t border-border pt-3 text-body-sm text-ink-muted">
          No budgets set.{" "}
          <Link href={`/finance/budgets?month=${month}`} className="font-medium text-accent-text underline-offset-4 hover:underline">
            Set a monthly amount
          </Link>{" "}
          for a category to see it here.
        </p>
      ) : (
        <ul>
          {overview.lines.map((line) => (
            <li
              key={line.categoryId}
              data-slot="overview-line"
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border py-3 sm:grid-cols-[130px_minmax(0,1fr)_150px_130px] sm:py-0 sm:h-[52px]"
            >
              <span className="truncate text-body font-medium text-ink">{line.name}</span>
              <span className="text-right text-body-sm text-ink-muted tabular-nums sm:col-start-3">
                {formatInr(line.spentPaise)} of {formatInr(line.budgetPaise)}
              </span>
              <SpendBar
                fill={line.fill}
                over={line.overByPaise > 0}
                className="col-span-2 h-2.5 sm:col-span-1 sm:col-start-2 sm:row-start-1"
              />
              <span className="col-span-2 sm:col-span-1">{line.overByPaise > 0 && <OverTag paise={line.overByPaise} />}</span>
            </li>
          ))}
        </ul>
      )}
      {overview.otherSpent > 0 && (
        <div className="flex h-11 items-center justify-between gap-4 sm:grid sm:grid-cols-[130px_minmax(0,1fr)_150px_130px]">
          <span className="text-body font-medium text-ink-muted">Other · no budget</span>
          <span className="text-right text-body-sm text-ink-muted tabular-nums sm:col-start-3">
            {formatInr(overview.otherSpent)}
          </span>
        </div>
      )}
    </section>
  );
}

// Overview (5b · Finance): the month's income, spending and what's left of the budget,
// then spending against budget per budgeted category, with the rest as Other.
export default async function FinanceOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const today = todayIso(await getUserTimezone(supabase));
  const { month, named } = monthParam(await searchParams, today);
  const { overview, error } = await getOverview(supabase, month);

  const switcher = <MonthSwitcher month={month} path="/finance/overview" />;

  let content: React.ReactNode;
  if (error || !overview) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load the overview"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else {
    const left = overview.totalBudget - overview.budgetedSpent;
    content = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Income" value={formatInr(overview.income)} caption="This month" />
          <Stat label="Spending" value={formatInr(overview.spending)} caption="This month" />
          <Stat
            label="Left to spend"
            value={formatInr(left)}
            tone={left < 0 ? "pink" : undefined}
            caption={overview.totalBudget > 0 ? `of ${formatInr(overview.totalBudget)} budgeted` : "No budgets set"}
          />
        </div>
        <Breakdown overview={overview} month={month} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <FinanceHeader tab="overview" month={named ? month : undefined} actions={switcher} />
      {content}
    </div>
  );
}
