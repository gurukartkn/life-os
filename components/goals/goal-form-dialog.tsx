"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGoal, deleteGoal, updateGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { GOAL_STATUS_LABELS } from "@/lib/goals";
import {
  GOAL_STATUSES,
  goalInputSchema,
  type Goal,
  type GoalInput,
  type GoalStatus,
  type GoalValues,
} from "@/lib/validations/goals";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = { success: false };

const STATUS_OPTIONS = GOAL_STATUSES.map((status) => ({ value: status, label: GOAL_STATUS_LABELS[status] }));

// The body of the goal sheet, keyed by the goal being edited (or "new") so each open
// starts from that goal's values with the matching action bound.
function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const [state, formAction, isSaving] = useActionState(goal ? updateGoal : createGoal, initialState);
  const [isDeleting, startDelete] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const form = useForm<GoalInput, unknown, GoalValues>({
    resolver: zodResolver(goalInputSchema),
    defaultValues: {
      title: goal?.title ?? "",
      targetDate: goal?.targetDate ?? "",
      status: goal?.status ?? "active",
    },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.success) onDone();
  }, [state, onDone]);

  function onSubmit(values: GoalValues) {
    const formData = new FormData();
    if (goal) formData.append("id", goal.id);
    formData.append("title", values.title);
    formData.append("targetDate", values.targetDate ?? "");
    formData.append("status", values.status);
    startTransition(() => formAction(formData));
  }

  function handleDelete() {
    if (!goal) return;
    setDeleteError(null);
    startDelete(async () => {
      // On success the action redirects to the Goals list; a result means it failed.
      const result = await deleteGoal(goal.id);
      if (result && !result.success) setDeleteError(result.error ?? "Couldn't delete the goal. Try again.");
    });
  }

  const busy = isSaving || isDeleting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DialogHeader title={goal ? "Edit goal" : "New goal"} />
      <div className="flex flex-col gap-4">
        <Field>
          <Label htmlFor="goal-title">Title</Label>
          <Input
            id="goal-title"
            autoFocus
            aria-invalid={errors.title ? true : undefined}
            {...form.register("title")}
          />
          <FieldError>{errors.title?.message}</FieldError>
        </Field>
        <Field>
          <Label id="goal-date-label">Target date (optional)</Label>
          <Controller
            control={form.control}
            name="targetDate"
            render={({ field }) => (
              <DatePicker
                label="Target date"
                placeholder="No date"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError>{errors.targetDate?.message}</FieldError>
        </Field>
        <Field>
          <Label id="goal-status-label">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <SegmentedControl<GoalStatus>
                label="Status"
                value={field.value}
                options={STATUS_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <FieldError>{state.error ?? deleteError}</FieldError>
      </div>
      {confirmingDelete ? (
        <DialogFooter className="flex-wrap justify-between">
          <p className="text-body-sm text-ink">Delete this goal? Its links go too; the items stay.</p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmingDelete(false)}>
              Keep goal
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
              {isDeleting ? "Deleting…" : "Delete goal"}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className={goal ? "justify-between" : undefined}>
          {goal && (
            <Button
              type="button"
              variant="ghost"
              className="text-pink-ink hover:text-pink-ink"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete goal
            </Button>
          )}
          <div className="flex items-center gap-2">
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy}>
              {isSaving ? "Saving…" : "Save goal"}
            </Button>
          </div>
        </DialogFooter>
      )}
    </form>
  );
}

// New / edit goal sheet (5a · "Goal create / edit"): title, target date and status.
// Editing adds Delete goal, which asks once before it deletes, then lands on the list.
export function GoalFormDialog({
  open,
  goal,
  onOpenChange,
}: {
  open: boolean;
  goal: Goal | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <GoalForm key={goal?.id ?? "new"} goal={goal} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
