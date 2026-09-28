import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TabBar, tabClassName } from "@/components/ui/tab-bar";
import { formatMonth, shiftMonth } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

export type FinanceTab = "overview" | "transactions" | "budgets" | "recurring" | "accounts" | "categories";

const TABS: { tab: FinanceTab; label: string; monthly: boolean }[] = [
  { tab: "overview", label: "Overview", monthly: true },
  { tab: "transactions", label: "Transactions", monthly: true },
  { tab: "budgets", label: "Budgets", monthly: true },
  { tab: "recurring", label: "Recurring", monthly: false },
  { tab: "accounts", label: "Accounts", monthly: false },
  { tab: "categories", label: "Categories", monthly: false },
];

// The Finance page header (5b · Finance): the title with the tab's actions on the right,
// then the six section tabs. Each tab is its own URL; the month being looked at travels
// with the tabs that show a month.
export function FinanceHeader({
  tab,
  month,
  actions,
}: {
  tab: FinanceTab;
  month?: string; // set when the URL named a month
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      {/* A fixed row height, so the tabs don't shift between a month switcher and a button. */}
      <PageHeader title="Finance" actions={actions} className="mb-0 min-h-10 flex-wrap" />
      <TabBar aria-label="Finance sections">
        {TABS.map((item) => {
          const href = `/finance/${item.tab}${item.monthly && month ? `?month=${month}` : ""}`;
          const active = item.tab === tab;
          return (
            <Link
              key={item.tab}
              href={href}
              aria-current={active ? "page" : undefined}
              className={tabClassName(active, "min-w-[72px]")}
            >
              {item.label}
            </Link>
          );
        })}
      </TabBar>
    </div>
  );
}

// ‹ September 2026 › — previous and next month as links, so the month is in the URL.
export function MonthSwitcher({ month, path }: { month: string; path: string }) {
  const link = cn(buttonVariants({ variant: "ghost", size: "icon-sm" }));
  return (
    <div className="flex items-center gap-0.5" data-slot="month-switcher">
      <Link href={`${path}?month=${shiftMonth(month, -1)}`} aria-label="Previous month" className={link}>
        <ChevronLeft strokeWidth={1.75} />
      </Link>
      <span aria-live="polite" className="w-[130px] text-center text-body font-semibold text-ink">
        {formatMonth(month)}
      </span>
      <Link href={`${path}?month=${shiftMonth(month, 1)}`} aria-label="Next month" className={link}>
        <ChevronRight strokeWidth={1.75} />
      </Link>
    </div>
  );
}
