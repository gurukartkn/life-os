"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleAlert, PiggyBank, Plus, X } from "lucide-react";
import { removeBudget, setBudget } from "@/actions/finance";
import { AmountInput } from "@/components/finance/amount-input";
import { FinanceHeader, MonthSwitcher } from "@/components/finance/finance-header";
import { OverTag, SpendBar } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RetryButton } from "@/components/ui/retry-button";
import { formatInr, paiseToInput } from "@/lib/finance/money";
import { budgetInputSchema } from "@/lib/validations/finance";
import type { BudgetLine, BudgetsView as Budgets } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 md:grid-cols-[140px_150px_90px_minmax(0,1fr)_150px]";

// The monthly amount, edited in place: saved on Enter or when the field loses focus,
// if it changed; Escape puts it back.
function BudgetAmount({
  categoryId,
  name,
  budgetPaise,
  autoFocus,
  onDone,
}: {
  categoryId: string;
  name: string;
  budgetPaise: number | null;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const saved = budgetPaise === null ? "" : paiseToInput(budgetPaise);
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    // Enter then blur would otherwise save twice.
    if (isPending) return;
    if (value.trim() === saved) {
      onDone?.();
      return;
    }
    if (!value.trim() && budgetPaise === null) {
      onDone?.();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setBudget({ categoryId, amount: value });
      if (!result.success) {
        setError(result.error ?? "Couldn't save the budget. Try again.");
        return;
      }
      onDone?.();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <AmountInput
        aria-label={`Monthly budget for ${name}`}
        value={value}
        autoFocus={autoFocus}
        placeholder="0"
        disabled={isPending}
        className="h-9 w-[150px] px-2.5"
        aria-invalid={error ? true : undefined}
        suffix={<span className="shrink-0 text-caption text-ink-muted">/ month</span>}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            setValue(saved);
            setError(null);
            onDone?.();
          }
        }}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function BudgetRow({ line }: { line: BudgetLine }) {
  const [isRemoving, startRemove] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const over = line.overByPaise > 0;

  return (
    <li data-slot="budget-row" className={cn(COLUMNS, "border-b border-border px-4 py-2.5 md:min-h-14")}>
      <span className="truncate text-body font-medium text-ink">{line.name}</span>
      <span className="justify-self-end md:justify-self-auto">
        <BudgetAmount key={line.budgetPaise} categoryId={line.categoryId} name={line.name} budgetPaise={line.budgetPaise} />
      </span>
      <span className="text-body text-ink tabular-nums md:text-right">
        <span className="text-caption text-ink-muted md:hidden">Spent </span>
        {formatInr(line.spentPaise)}
      </span>
      <span className="flex items-center gap-2.5">
        <SpendBar fill={line.fill} over={over} />
        <span className={cn("w-10 shrink-0 text-label", over ? "text-pink-ink" : "text-ink-muted")}>{line.percent}%</span>
      </span>
      <span className="col-span-2 flex items-center justify-end gap-1 md:col-span-1">
        {over && <OverTag paise={line.overByPaise} />}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove budget for ${line.name}`}
          title="Remove budget"
          disabled={isRemoving}
          onClick={() =>
            startRemove(async () => {
              const result = await removeBudget(line.categoryId);
              if (!result.success) setError(result.error ?? "Couldn't remove the budget. Try again.");
            })
          }
        >
          <X strokeWidth={1.75} />
        </Button>
      </span>
      {error && <FieldError className="col-span-full">{error}</FieldError>}
    </li>
  );
}

function UnbudgetedRow({ categoryId, name, spentPaise }: { categoryId: string; name: string; spentPaise: number }) {
  const [editing, setEditing] = useState(false);
  return (
    <li data-slot="budget-row" className={cn(COLUMNS, "border-b border-border px-4 py-2.5 md:min-h-14")}>
      <span className="truncate text-body font-medium text-ink">{name}</span>
      <span className="justify-self-end md:justify-self-auto">
        {editing ? (
          <BudgetAmount categoryId={categoryId} name={name} budgetPaise={null} autoFocus onDone={() => setEditing(false)} />
        ) : (
          <span className="text-body-sm text-ink-muted">No budget</span>
        )}
      </span>
      <span className="text-body text-ink-muted tabular-nums md:text-right">
        <span className="text-caption md:hidden">Spent </span>
        {formatInr(spentPaise)}
      </span>
      <span className="hidden md:block" />
      <span className="col-span-2 flex justify-end md:col-span-1">
        {!editing && (
          <Button type="button" variant="outline" size="sm" aria-label={`Set budget for ${name}`} onClick={() => setEditing(true)}>
            <Plus strokeWidth={1.75} />
            Set budget
          </Button>
        )}
      </span>
    </li>
  );
}

function AddBudgetDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { categoryId: string; name: string }[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset(next: boolean) {
    if (!next) {
      setCategoryId("");
      setAmount("");
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const chosen = categoryId || categories[0]?.categoryId;
    if (!chosen) return;
    const parsed = budgetInputSchema.safeParse({ categoryId: chosen, amount });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter an amount.");
      return;
    }
    startTransition(async () => {
      const result = await setBudget({ categoryId: chosen, amount });
      if (!result.success) {
        setError(result.error ?? "Couldn't save the budget. Try again.");
        return;
      }
      reset(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader title="Add budget" description="One monthly amount for an expense category." />
          {categories.length === 0 ? (
            <p className="text-body text-ink-muted">
              Every expense category already has a budget.{" "}
              <Link href="/finance/categories" className="font-medium text-accent-text underline-offset-4 hover:underline">
                Add a category
              </Link>{" "}
              to budget for something new.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <Field>
                <Label htmlFor="budget-category">Category</Label>
                <NativeSelect id="budget-category" value={categoryId || categories[0].categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <Label htmlFor="budget-amount">Monthly budget</Label>
                <AmountInput
                  id="budget-amount"
                  autoFocus
                  placeholder="0"
                  value={amount}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError(null);
                  }}
                />
                <FieldError>{error}</FieldError>
              </Field>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
            {categories.length > 0 && (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save budget"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Budgets (5b · Finance): one monthly amount per expense category, edited in place, with
// the month's spend and progress, the excess written out when over, and Set budget for
// the categories without one. Totals underneath.
export function BudgetsView({
  month,
  named,
  budgets,
  loadError = false,
}: {
  month: string;
  named: boolean;
  budgets: Budgets | null;
  loadError?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const addButton = (
    <Button type="button" onClick={() => setAdding(true)}>
      <Plus strokeWidth={1.75} />
      Add budget
    </Button>
  );

  let content: React.ReactNode;
  if (loadError || !budgets) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load budgets"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (budgets.budgeted.length === 0 && budgets.unbudgeted.length === 0) {
    content = (
      <EmptyState
        icon={PiggyBank}
        title="No budgets set"
        description="Set a monthly amount for a category to track spending. Add an expense category first."
        action={
          <Link href="/finance/categories" className="text-body font-medium text-accent-text underline-offset-4 hover:underline">
            Go to Categories
          </Link>
        }
      />
    );
  } else if (budgets.budgeted.length === 0) {
    content = (
      <div className="flex flex-col gap-3">
        <EmptyState
          icon={PiggyBank}
          title="No budgets set"
          description="Set a monthly amount for a category to track spending."
          action={addButton}
        />
        <BudgetTable budgets={budgets} />
      </div>
    );
  } else {
    content = <BudgetTable budgets={budgets} />;
  }

  return (
    <div className="flex flex-col">
      <FinanceHeader tab="budgets" month={named ? month : undefined} actions={<MonthSwitcher month={month} path="/finance/budgets" />} />
      {!loadError && budgets && (budgets.budgeted.length > 0 || budgets.unbudgeted.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-body-sm text-ink-muted">One monthly amount per category. Edit an amount in place.</p>
          {budgets.budgeted.length > 0 && addButton}
        </div>
      )}
      {content}
      <AddBudgetDialog open={adding} onOpenChange={setAdding} categories={budgets?.unbudgeted ?? []} />
    </div>
  );
}

function BudgetTable({ budgets }: { budgets: Budgets }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      <div aria-hidden="true" className={cn(COLUMNS, "hidden h-9 border-b border-border bg-surface-200 px-4 text-label text-ink-muted md:grid")}>
        <span>Category</span>
        <span>Monthly budget</span>
        <span className="text-right">Spent</span>
        <span>Progress</span>
        <span />
      </div>
      <ul aria-label="Budgets">
        {budgets.budgeted.map((line) => (
          <BudgetRow key={line.categoryId} line={line} />
        ))}
        {budgets.unbudgeted.map((category) => (
          <UnbudgetedRow key={category.categoryId} {...category} />
        ))}
      </ul>
      {budgets.budgeted.length > 0 && (
        <div data-slot="budget-totals" className={cn(COLUMNS, "min-h-11 bg-surface-200 px-4 py-2 text-body-sm font-semibold text-ink")}>
          <span>Total budgeted</span>
          <span className="justify-self-end tabular-nums md:justify-self-auto">{formatInr(budgets.totalBudget)}</span>
          <span className="tabular-nums md:text-right">
            <span className="font-normal text-ink-muted md:hidden">Spent </span>
            {formatInr(budgets.totalSpent)}
          </span>
        </div>
      )}
    </div>
  );
}
