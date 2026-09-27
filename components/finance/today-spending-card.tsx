import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OverTag, SpendBar } from "@/components/finance/money";
import { buttonVariants } from "@/components/ui/button";
import { budgetStatus, formatInr, monthName } from "@/lib/finance/money";
import type { TodaySpending } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

// Today's Spending card (Today dashboard board): this month's spend in budgeted
// categories against the total budget, the most over-budget category, and a link to
// Finance. The page leaves it out when there are no budgets and no transactions yet.
export function TodaySpendingCard({ spending, loadError = false }: { spending: TodaySpending | null; loadError?: boolean }) {
  let body: React.ReactNode = null;
  if (loadError) {
    body = (
      <p role="alert" className="border-t border-border py-3 text-body-sm text-pink-ink">
        Couldn’t load spending.
      </p>
    );
  } else if (spending) {
    const month = monthName(spending.month);
    if (spending.totalBudget > 0) {
      const status = budgetStatus(spending.budgetedSpent, spending.totalBudget);
      body = (
        <>
          <p className="text-page-title text-ink tabular-nums">{formatInr(spending.budgetedSpent)}</p>
          <p className="text-caption text-ink-muted">
            of {formatInr(spending.totalBudget)} budgeted · {month}
          </p>
          <SpendBar fill={status.fill} over={status.overByPaise > 0} />
          {spending.mostOver && (
            <div>
              <OverTag paise={spending.mostOver.overByPaise}>
                {spending.mostOver.name} {formatInr(spending.mostOver.overByPaise)} over
              </OverTag>
            </div>
          )}
        </>
      );
    } else {
      body = (
        <>
          <p className="text-page-title text-ink tabular-nums">{formatInr(spending.spending)}</p>
          <p className="text-caption text-ink-muted">spent in {month} · no budgets set</p>
        </>
      );
    }
  }

  return (
    <section
      aria-label="Spending this month"
      data-slot="today-spending"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface-100 p-4"
    >
      <h2 className="text-heading text-ink">Spending this month</h2>
      {body}
      <Link href="/finance/overview" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}>
        Finance
        <ChevronRight strokeWidth={1.75} />
      </Link>
    </section>
  );
}
