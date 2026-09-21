"use client";

import { startTransition, useActionState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createTask } from "@/actions/tasks";
import { taskInsertSchema, type TaskInsertInput } from "@/lib/validations/tasks";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = { success: false };

export function AddTaskForm() {
  const [state, formAction, isPending] = useActionState(createTask, initialState);
  const form = useForm<TaskInsertInput>({
    resolver: zodResolver(taskInsertSchema),
    defaultValues: { title: "", due_date: "" },
  });

  useEffect(() => {
    if (state.success) {
      form.reset({ title: "", due_date: "" });
    }
  }, [state, form]);

  function onSubmit(values: TaskInsertInput) {
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.due_date) formData.append("due_date", values.due_date);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1.5" noValidate>
      <div className="flex items-start gap-2">
        <Input
          aria-label="Task title"
          placeholder="Add a task…"
          {...form.register("title")}
        />
        <Controller
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <DatePicker
              label="Due date"
              placeholder="Due date"
              className="w-44 shrink-0"
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <Button type="submit" disabled={isPending}>
          <Plus />
          {isPending ? "Adding…" : "New task"}
        </Button>
      </div>
      {(form.formState.errors.title || form.formState.errors.due_date || state.error) && (
        <p className="text-caption text-pink-ink">
          {form.formState.errors.title?.message ??
            form.formState.errors.due_date?.message ??
            state.error}
        </p>
      )}
    </form>
  );
}
