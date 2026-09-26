"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { createTask, deleteTask, updateTask } from "@/actions/tasks";
import { taskInsertSchema, type TaskInsertInput } from "@/lib/validations/tasks";
import { isOverdue } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { ActionResult } from "@/lib/types/action-result";
import type { Tables } from "@/lib/types/database";

const initialState: ActionResult = { success: false };

// The body of the task modal. It is keyed by the task being edited (or "new"), so
// each open starts from that task's values with the matching action bound.
function TaskForm({ task, onDone }: { task: Tables<"tasks"> | null; onDone: () => void }) {
  const [state, formAction, isSaving] = useActionState(task ? updateTask : createTask, initialState);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const form = useForm<TaskInsertInput>({
    resolver: zodResolver(taskInsertSchema),
    defaultValues: { title: task?.title ?? "", due_date: task?.due_date ?? "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.success) onDone();
  }, [state, onDone]);

  function onSubmit(values: TaskInsertInput) {
    const formData = new FormData();
    if (task) formData.append("id", task.id);
    formData.append("title", values.title);
    if (values.due_date) formData.append("due_date", values.due_date);
    startTransition(() => formAction(formData));
  }

  function handleDelete() {
    if (!task) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteTask(task.id);
      if (result.success) onDone();
      else setDeleteError(result.error ?? "Couldn't delete the task. Try again.");
    });
  }

  const busy = isSaving || isDeleting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <DialogHeader title={task ? "Edit task" : "Add task"} />
      <div className="flex flex-col gap-4">
        <Field>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            autoFocus
            aria-invalid={errors.title ? true : undefined}
            {...form.register("title")}
          />
          <FieldError>{errors.title?.message}</FieldError>
        </Field>
        <Field>
          <Label id="task-due-label">Due date (optional)</Label>
          <Controller
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <DatePicker
                label="Due date"
                placeholder="No date"
                value={field.value ?? ""}
                onChange={field.onChange}
                // A past date is allowed; the field says it will be overdue.
                adornment={
                  field.value && isOverdue(field.value) && !task?.is_completed ? (
                    <Tag tone="pink">
                      <AlertCircle strokeWidth={1.75} />
                      Overdue
                    </Tag>
                  ) : null
                }
              />
            )}
          />
          <FieldError>{errors.due_date?.message}</FieldError>
        </Field>
        <FieldError>{state.error ?? deleteError}</FieldError>
      </div>
      <DialogFooter className={task ? "justify-between" : undefined}>
        {task && (
          <Button
            type="button"
            variant="ghost"
            className="text-pink-ink hover:text-pink-ink"
            disabled={busy}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting…" : "Delete task"}
          </Button>
        )}
        <div className="flex items-center gap-2">
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          <Button type="submit" disabled={busy}>
            {task ? (isSaving ? "Saving…" : "Save changes") : isSaving ? "Adding…" : "Add task"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

// Add / edit task modal (Tasks "Task form with date picker" board).
export function TaskFormDialog({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task: Tables<"tasks"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <TaskForm key={task?.id ?? "new"} task={task} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
