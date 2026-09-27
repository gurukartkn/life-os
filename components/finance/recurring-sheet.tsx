"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRecurring, deleteRecurring, updateRecurring } from "@/actions/finance";
import { AmountInput } from "@/components/finance/amount-input";
import { KIND_OPTIONS, pickable } from "@/components/finance/transaction-sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FREQUENCY_LABELS, paiseToInput, type FinanceKind } from "@/lib/finance/money";
import type { ActionResult } from "@/lib/types/action-result";
import {
  FREQUENCIES,
  recurringInputSchema,
  type Account,
  type Category,
  type RecurringInput,
  type RecurringItem,
  type RecurringValues,
} from "@/lib/validations/finance";

const initialState: ActionResult = { success: false };

function RecurringForm({
  item,
  accounts,
  categories,
  today,
  onDone,
}: {
  item: RecurringItem | null;
  accounts: Account[];
  categories: Category[];
  today: string;
  onDone: () => void;
}) {
  const [state, formAction, isSaving] = useActionState(item ? updateRecurring : createRecurring, initialState);
  const [isDeleting, startDelete] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountChoices = pickable(accounts, item?.accountId);
  const initialKind = item?.kind ?? "expense";
  const form = useForm<RecurringInput, unknown, RecurringValues>({
    resolver: zodResolver(recurringInputSchema),
    defaultValues: {
      name: item?.name ?? "",
      kind: initialKind,
      amount: item ? paiseToInput(item.amountPaise) : "",
      accountId: item?.accountId ?? accountChoices.find((a) => a.isActive)?.id ?? "",
      categoryId: item?.categoryId ?? pickable(categories, null).find((c) => c.kind === initialKind)?.id ?? "",
      frequency: item?.frequency ?? "monthly",
      nextOn: item?.nextOn ?? today,
    },
  });
  const { errors } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" }) as FinanceKind;
  const categoryChoices = pickable(categories, item?.categoryId).filter((category) => category.kind === kind);

  useEffect(() => {
    if (state.success) onDone();
  }, [state, onDone]);

  function onSubmit() {
    const values = form.getValues();
    const formData = new FormData();
    if (item) formData.append("id", item.id);
    for (const key of ["name", "kind", "amount", "accountId", "categoryId", "frequency", "nextOn"] as const) {
      formData.append(key, String(values[key] ?? ""));
    }
    startTransition(() => formAction(formData));
  }

  function handleDelete() {
    if (!item) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteRecurring(item.id);
      if (result.success) onDone();
      else setDeleteError(result.error ?? "Couldn't delete the recurring item. Try again.");
    });
  }

  const busy = isSaving || isDeleting;
  const missing = accountChoices.length === 0 ? "an account" : categories.some((c) => c.isActive) ? null : "a category";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DialogHeader title={item ? "Edit recurring item" : "Add recurring item"} />
      {missing ? (
        <p className="text-body text-ink-muted">
          Add {missing} first.{" "}
          <Link
            href={missing === "an account" ? "/finance/accounts" : "/finance/categories"}
            className="font-medium text-accent-text underline-offset-4 hover:underline"
          >
            Go to {missing === "an account" ? "Accounts" : "Categories"}
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
                  const picked = categories.find((category) => category.id === form.getValues("categoryId"));
                  if (!picked || picked.kind !== next) {
                    form.setValue("categoryId", pickable(categories, null).find((c) => c.kind === next)?.id ?? "");
                  }
                }}
              />
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="recurring-name">Name</Label>
              <Input
                id="recurring-name"
                autoFocus
                maxLength={100}
                aria-invalid={errors.name ? true : undefined}
                {...form.register("name")}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="recurring-amount">Amount</Label>
              <AmountInput
                id="recurring-amount"
                placeholder="0"
                aria-invalid={errors.amount ? true : undefined}
                {...form.register("amount")}
              />
              <FieldError>{errors.amount?.message}</FieldError>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="recurring-category">Category</Label>
              <NativeSelect id="recurring-category" aria-invalid={errors.categoryId ? true : undefined} {...form.register("categoryId")}>
                {categoryChoices.length === 0 && <option value="">No {kind} categories</option>}
                {categoryChoices.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive ? "" : " (archived)"}
                  </option>
                ))}
              </NativeSelect>
              <FieldError>{errors.categoryId?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="recurring-account">Account</Label>
              <NativeSelect id="recurring-account" {...form.register("accountId")}>
                {accountChoices.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.isActive ? "" : " (archived)"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="recurring-frequency">How often</Label>
              <NativeSelect id="recurring-frequency" {...form.register("frequency")}>
                {FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {FREQUENCY_LABELS[frequency]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <Label id="recurring-next-label">Next date</Label>
              <Controller
                control={form.control}
                name="nextOn"
                render={({ field }) => (
                  <DatePicker label="Next date" placeholder="Pick a date" value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldError>{errors.nextOn?.message}</FieldError>
            </Field>
          </div>
          <FieldError>{state.error ?? deleteError}</FieldError>
        </div>
      )}
      {confirmingDelete ? (
        <DialogFooter className="flex-wrap justify-between">
          <p className="text-body-sm text-ink">Delete this recurring item? Transactions already logged stay.</p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
              {isDeleting ? "Deleting…" : "Delete recurring item"}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className={item ? "justify-between" : undefined}>
          {item && (
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
            {!missing && (
              <Button type="submit" disabled={busy}>
                {isSaving ? "Saving…" : "Save recurring item"}
              </Button>
            )}
          </div>
        </DialogFooter>
      )}
    </form>
  );
}

// Add / edit recurring item sheet (5b · Finance): Expense or Income, name, amount,
// category, account, how often and the next date. Editing adds Delete, which asks once.
export function RecurringSheet({
  open,
  item,
  accounts,
  categories,
  today,
  onOpenChange,
}: {
  open: boolean;
  item: RecurringItem | null;
  accounts: Account[];
  categories: Category[];
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {open && (
          <RecurringForm
            key={item?.id ?? "new"}
            item={item}
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
