"use client";

import { useCallback, useState, useTransition } from "react";
import { CircleAlert, Pencil, Plus, Repeat } from "lucide-react";
import { logRecurring, skipRecurring } from "@/actions/finance";
import { FinanceHeader } from "@/components/finance/finance-header";
import { Amount } from "@/components/finance/money";
import { RecurringSheet } from "@/components/finance/recurring-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field";
import { RetryButton } from "@/components/ui/retry-button";
import { Tag } from "@/components/ui/tag";
import { formatDay, FREQUENCY_LABELS } from "@/lib/finance/money";
import type { RecurringRow as Row } from "@/lib/queries/finance";
import type { Account, Category, RecurringItem } from "@/lib/validations/finance";
import { cn } from "@/lib/utils";

const COLUMNS =
  "md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_90px_minmax(170px,1.1fr)_110px_32px] md:items-center md:gap-3.5";

function RecurringListRow({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(row.id);
      if (!result.success) setError(result.error ?? "Couldn't do that. Try again.");
    });
  }

  return (
    <li
      data-slot="recurring-row"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border py-2.5 pr-3 pl-4 last:border-b-0 md:min-h-[52px]",
        COLUMNS
      )}
    >
      <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{row.name}</span>
      <span className="hidden min-w-0 md:block">
        <Tag className="max-w-full truncate">{row.categoryName}</Tag>
      </span>
      <span className="hidden truncate text-body-sm text-ink-muted md:block">{row.accountName}</span>
      <span className="hidden text-body-sm text-ink-muted md:block">{FREQUENCY_LABELS[row.frequency]}</span>
      <span className="order-last flex w-full flex-wrap items-center gap-1.5 md:order-none md:w-auto">
        <span className="text-body-sm text-ink-muted md:hidden">
          {row.categoryName} · {row.accountName} · {FREQUENCY_LABELS[row.frequency]} ·
        </span>
        <span className={cn("text-body-sm", row.due ? "font-medium text-ink" : "text-ink-muted")}>
          {formatDay(row.nextOn, true)}
        </span>
        {row.due && (
          <>
            <Tag tone="blue">Due</Tag>
            <Button type="button" size="xs" disabled={isPending} onClick={() => run(logRecurring)} aria-label={`Log ${row.name}`}>
              Log it
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={isPending}
              onClick={() => run(skipRecurring)}
              aria-label={`Skip ${row.name}`}
            >
              Skip
            </Button>
          </>
        )}
      </span>
      <Amount paise={row.amountPaise} kind={row.kind} className="text-right" />
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`} onClick={onEdit}>
        <Pencil strokeWidth={1.75} />
      </Button>
      {error && <FieldError className="order-last w-full md:col-span-full">{error}</FieldError>}
    </li>
  );
}

// Recurring (5b · Finance): rent, salary and subscriptions that repeat, soonest first.
// An item whose next date has come shows Due, with Log it (records the transaction and
// moves the date on) and Skip (only moves the date on).
export function RecurringView({
  items,
  accounts,
  categories,
  today,
  loadError = false,
}: {
  items: Row[];
  accounts: Account[];
  categories: Category[];
  today: string;
  loadError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringItem | null>(null);
  const openNew = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  const addButton = (
    <Button type="button" onClick={openNew}>
      <Plus strokeWidth={1.75} />
      Add recurring item
    </Button>
  );

  let content: React.ReactNode;
  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load recurring items"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon={Repeat}
        title="No recurring items"
        description="Add rent, salary or subscriptions that repeat."
        action={addButton}
      />
    );
  } else {
    content = (
      <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
        <div aria-hidden="true" className={cn("hidden h-9 border-b border-border bg-surface-200 pr-3 pl-4 text-label text-ink-muted", COLUMNS)}>
          <span>Name</span>
          <span>Category</span>
          <span>Account</span>
          <span>How often</span>
          <span>Next date</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <ul aria-label="Recurring items">
          {items.map((row) => (
            <RecurringListRow
              key={row.id}
              row={row}
              onEdit={() => {
                setEditing(row);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <FinanceHeader tab="recurring" actions={loadError ? undefined : addButton} />
      {content}
      <RecurringSheet
        open={open}
        item={editing}
        accounts={accounts}
        categories={categories}
        today={today}
        onOpenChange={setOpen}
      />
    </div>
  );
}
