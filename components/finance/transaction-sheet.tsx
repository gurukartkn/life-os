"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTransaction, deleteTransaction, updateTransaction } from "@/actions/finance";
import { AmountInput } from "@/components/finance/amount-input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { paiseToInput, type FinanceKind } from "@/lib/finance/money";
import type { ActionResult } from "@/lib/types/action-result";
import {
  transactionInputSchema,
  type Account,
  type Category,
  type Transaction,
  type TransactionInput,
  type TransactionValues,
} from "@/lib/validations/finance";

const initialState: ActionResult = { success: false };

export const KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

// The pickers offer active labels (and, for a category, only those of the item's kind),
// plus whatever the item being edited already uses so it isn't silently changed.
export function pickable<T extends { id: string; isActive: boolean }>(items: T[], keep: string | null | undefined): T[] {
  return items.filter((item) => item.isActive || item.id === keep);
}

function TransactionForm({
  transaction,
  accounts,
  categories,
  today,
  onDone,
}: {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  today: string;
  onDone: () => void;
}) {
  const [state, formAction, isSaving] = useActionState(transaction ? updateTransaction : createTransaction, initialState);
  const [isDeleting, startDelete] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountChoices = pickable(accounts, transaction?.accountId);
  const form = useForm<TransactionInput, unknown, TransactionValues>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: {
      kind: transaction?.kind ?? "expense",
      amount: transaction ? paiseToInput(transaction.amountPaise) : "",
      occurredOn: transaction?.occurredOn ?? today,
      accountId: transaction?.accountId ?? accountChoices.find((a) => a.isActive)?.id ?? "",
      categoryId: transaction?.categoryId ?? "",
      note: transaction?.note ?? "",
    },
  });
  const { errors } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" }) as FinanceKind;
  const categoryChoices = pickable(categories, transaction?.categoryId).filter((category) => category.kind === kind);

  useEffect(() => {
    if (state.success) onDone();
  }, [state, onDone]);

  function onSubmit() {
    // The raw strings, as typed: the action parses them again with the same schema.
    const values = form.getValues();
    const formData = new FormData();
    if (transaction) formData.append("id", transaction.id);
    for (const key of ["kind", "amount", "occurredOn", "accountId", "categoryId", "note"] as const) {
      formData.append(key, String(values[key] ?? ""));
    }
    startTransition(() => formAction(formData));
  }

  function handleDelete() {
    if (!transaction) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.success) onDone();
      else setDeleteError(result.error ?? "Couldn't delete the transaction. Try again.");
    });
  }

  const busy = isSaving || isDeleting;
  const noAccounts = accountChoices.length === 0;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DialogHeader
        title={transaction ? "Edit transaction" : "Add transaction"}
        description={noAccounts ? undefined : "Amounts are in ₹."}
      />
      {noAccounts ? (
        <p className="text-body text-ink-muted">
          Add an account first — a label like HDFC Savings.{" "}
          <Link href="/finance/accounts" className="font-medium text-accent-text underline-offset-4 hover:underline">
            Go to Accounts
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <SegmentedControl<FinanceKind>
                label="Type"
                value={field.value as FinanceKind}
                options={KIND_OPTIONS}
                onChange={(next) => {
                  field.onChange(next);
                  // A category of the other kind can't stay picked.
                  const picked = categories.find((category) => category.id === form.getValues("categoryId"));
                  if (picked && picked.kind !== next) form.setValue("categoryId", "");
                }}
              />
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="transaction-amount">Amount</Label>
              <AmountInput
                id="transaction-amount"
                autoFocus
                placeholder="0"
                aria-invalid={errors.amount ? true : undefined}
                {...form.register("amount")}
              />
              <FieldError>{errors.amount?.message}</FieldError>
            </Field>
            <Field>
              <Label id="transaction-date-label">Date</Label>
              <Controller
                control={form.control}
                name="occurredOn"
                render={({ field }) => (
                  <DatePicker label="Date" placeholder="Pick a date" value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldError>{errors.occurredOn?.message}</FieldError>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="transaction-account">Account</Label>
              <NativeSelect id="transaction-account" aria-invalid={errors.accountId ? true : undefined} {...form.register("accountId")}>
                {accountChoices.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.isActive ? "" : " (archived)"}
                  </option>
                ))}
              </NativeSelect>
              <FieldError>{errors.accountId?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="transaction-category">Category</Label>
              <NativeSelect id="transaction-category" {...form.register("categoryId")}>
                <option value="">Uncategorised</option>
                {categoryChoices.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive ? "" : " (archived)"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field>
            <Label htmlFor="transaction-note">Note (optional)</Label>
            <Input
              id="transaction-note"
              maxLength={500}
              aria-invalid={errors.note ? true : undefined}
              {...form.register("note")}
            />
            <FieldError>{errors.note?.message}</FieldError>
          </Field>
          <FieldError>{state.error ?? deleteError}</FieldError>
        </div>
      )}
      {confirmingDelete ? (
        <DialogFooter className="flex-wrap justify-between">
          <p className="text-body-sm text-ink">Delete this transaction? This can’t be undone.</p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
              {isDeleting ? "Deleting…" : "Delete transaction"}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className={transaction ? "justify-between" : undefined}>
          {transaction && (
            <Button
              type="button"
              variant="ghost"
              className="text-pink-ink hover:text-pink-ink"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
          <div className="flex items-center gap-2">
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
            {!noAccounts && (
              <Button type="submit" disabled={busy}>
                {isSaving ? "Saving…" : "Save transaction"}
              </Button>
            )}
          </div>
        </DialogFooter>
      )}
    </form>
  );
}

// Add / edit transaction sheet (5b · Finance): Expense or Income, ₹ amount, date,
// account, category and an optional note. Editing adds Delete, which asks once.
export function TransactionSheet({
  open,
  transaction,
  accounts,
  categories,
  today,
  onOpenChange,
}: {
  open: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {open && (
          <TransactionForm
            key={transaction?.id ?? "new"}
            transaction={transaction}
            accounts={accounts}
            categories={categories}
            today={today}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
