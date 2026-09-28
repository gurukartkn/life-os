"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { isOverdue } from "@/lib/dates";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { TaskFormInput as TaskFormValues } from "@/lib/validations/tasks";

// Title and due date — the fields the create dialog and the drawer's edit form share.
export function TaskFields({ form, isCompleted = false }: { form: UseFormReturn<TaskFormValues>; isCompleted?: boolean }) {
  const { errors } = form.formState;

  return (
    <>
      <Field>
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" autoFocus aria-invalid={errors.title ? true : undefined} {...form.register("title")} />
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
                field.value && isOverdue(field.value) && !isCompleted ? (
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
    </>
  );
}

export function taskFormData(values: TaskFormValues, id?: string): FormData {
  const formData = new FormData();
  if (id) formData.append("id", id);
  formData.append("title", values.title);
  if (values.due_date) formData.append("due_date", values.due_date);
  return formData;
}
