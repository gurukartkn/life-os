"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, CircleAlert, Pencil, Plus, ReceiptText, Upload } from "lucide-react";
import { FinanceHeader } from "@/components/finance/finance-header";
import { Amount } from "@/components/finance/money";
import { TransactionSheet } from "@/components/finance/transaction-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import { RetryButton } from "@/components/ui/retry-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tag } from "@/components/ui/tag";
import { formatDay, formatMonth, shiftMonth, type FinanceKind } from "@/lib/finance/money";
import { transactionsHref, type TransactionParams } from "@/lib/finance/params";
import type { TransactionRow } from "@/lib/queries/finance";
import type { Account, Category, Transaction } from "@/lib/validations/finance";
import { cn } from "@/lib/utils";

type KindFilter = "all" | FinanceKind;

const KIND_FILTERS = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

function ArchivedTag() {
  return (
    <Tag>
      <Archive strokeWidth={1.75} />
      Archived
    </Tag>
  );
}

// The month picker's range: two years back to one ahead, always including the month shown.
function monthOptions(current: string, thisMonth: string): string[] {
  const months = new Set<string>();
  for (let delta = 12; delta >= -24; delta--) months.add(shiftMonth(thisMonth, delta));
  months.add(current);
  return [...months].sort().reverse();
}

const COLUMNS = "md:grid md:grid-cols-[70px_minmax(0,1fr)_150px_150px_110px_32px] md:items-center md:gap-3.5";

// Transactions (5b · Finance): month, account, category and type filters — all in the URL
// — the count, then the month's transactions newest first with signed amounts. Add and
// edit use the transaction sheet; Import CSV opens the import wizard.
export function TransactionsView({
  filters,
  thisMonth,
  today,
  transactions,
  count,
  shownLimit,
  accounts,
  categories,
  loadError = false,
}: {
  filters: TransactionParams;
  thisMonth: string;
  today: string;
  transactions: TransactionRow[];
  count: number;
  shownLimit: number;
  accounts: Account[];
  categories: Category[];
  loadError?: boolean;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const openNew = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  function go(changes: Partial<TransactionParams>) {
    const next = { ...filters, ...changes };
    startNavigation(() =>
      router.push(
        transactionsHref({
          month: next.month === thisMonth && !next.named ? undefined : next.month,
          account: next.account,
          category: next.category,
          kind: next.kind,
        })
      )
    );
  }

  const filtered = Boolean(filters.account || filters.category || filters.kind);
  const addButton = (
    <Button type="button" onClick={openNew}>
      <Plus strokeWidth={1.75} />
      Add transaction
    </Button>
  );
  const actions = (
    <>
      <Link href="/finance/import" className={buttonVariants({ variant: "outline" })}>
        <Upload strokeWidth={1.75} />
        Import CSV
      </Link>
      {addButton}
    </>
  );

  let list: React.ReactNode;
  if (loadError) {
    list = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load transactions"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (transactions.length === 0) {
    list = (
      <EmptyState
        icon={ReceiptText}
        title="No transactions here"
        description={
          filtered ? "Nothing matches these filters. Clear them or add a transaction." : `Nothing recorded in ${formatMonth(filters.month)} yet.`
        }
        action={
          filtered ? (
            <Button type="button" variant="outline" onClick={() => go({ account: undefined, category: undefined, kind: undefined })}>
              Clear filters
            </Button>
          ) : (
            addButton
          )
        }
      />
    );
  } else {
    list = (
      <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
        <div
          aria-hidden="true"
          className={cn("hidden h-9 border-b border-border bg-surface-200 pr-3 pl-4 text-label text-ink-muted", COLUMNS)}
        >
          <span>Date</span>
          <span>Note</span>
          <span>Category</span>
          <span>Account</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <ul aria-label="Transactions">
          {transactions.map((row) => (
            <li
              key={row.id}
              data-slot="transaction-row"
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2.5 pr-3 pl-4 last:border-b-0 md:min-h-[52px] md:py-1.5",
                COLUMNS
              )}
            >
              <span className="w-[70px] text-body-sm text-ink-muted md:w-auto">{formatDay(row.occurredOn)}</span>
              <span className={cn("min-w-0 flex-1 truncate text-body font-medium", row.note ? "text-ink" : "text-ink-muted")}>
                {row.note ?? "No note"}
              </span>
              <span className="order-last flex w-full min-w-0 flex-wrap items-center gap-1 md:order-none md:w-auto">
                {row.categoryName ? (
                  <Tag className="max-w-full truncate">{row.categoryName}</Tag>
                ) : (
                  <Tag tone="dashed">Uncategorised</Tag>
                )}
                {row.categoryArchived && <ArchivedTag />}
                <span className="truncate text-body-sm text-ink-muted md:hidden">· {row.accountName}</span>
                {row.accountArchived && <span className="md:hidden"><ArchivedTag /></span>}
              </span>
              <span className="hidden min-w-0 items-center gap-1 md:flex">
                <span className="truncate text-body-sm text-ink-muted">{row.accountName}</span>
                {row.accountArchived && <ArchivedTag />}
              </span>
              <Amount paise={row.amountPaise} kind={row.kind} className="text-right md:block" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${row.note ?? `transaction on ${formatDay(row.occurredOn)}`}`}
                onClick={() => {
                  setEditing(row);
                  setOpen(true);
                }}
              >
                <Pencil strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <FinanceHeader tab="transactions" month={filters.named ? filters.month : undefined} actions={actions} />
      <div className="flex flex-col gap-4" aria-busy={isNavigating || undefined}>
        <div role="group" aria-label="Filter transactions" className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Month"
            className="w-[170px]"
            value={filters.month}
            onChange={(event) => go({ month: event.target.value, named: true })}
          >
            {monthOptions(filters.month, thisMonth).map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Account"
            className="w-[170px]"
            value={filters.account ?? ""}
            onChange={(event) => go({ account: event.target.value || undefined })}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.isActive ? "" : " (archived)"}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Category"
            className="w-[170px]"
            value={filters.category ?? ""}
            onChange={(event) => go({ category: event.target.value || undefined })}
          >
            <option value="">All categories</option>
            <option value="none">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " (archived)"}
              </option>
            ))}
          </NativeSelect>
          <SegmentedControl<KindFilter>
            label="Type"
            value={filters.kind ?? "all"}
            options={KIND_FILTERS}
            onChange={(kind) => go({ kind: kind === "all" ? undefined : kind })}
          />
          <span className="flex-1" />
          {!loadError && (
            <p className="text-body-sm text-ink-muted" data-slot="transaction-count">
              {count === 1 ? "1 transaction" : `${count} transactions`}
              {count > transactions.length && ` · showing the latest ${shownLimit}`}
            </p>
          )}
        </div>
        {list}
      </div>
      <TransactionSheet
        open={open}
        transaction={editing}
        accounts={accounts}
        categories={categories}
        today={today}
        onOpenChange={setOpen}
      />
    </div>
  );
}
