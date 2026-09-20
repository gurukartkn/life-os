"use client";

import { startTransition, useActionState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createGoal } from "@/actions/goals";
import { goalInsertSchema, type GoalInsertInput } from "@/lib/validations/goals";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = { success: false };

export function AddGoalForm() {
  const [state, formAction, isPending] = useActionState(createGoal, initialState);
  const form = useForm<GoalInsertInput>({
    resolver: zodResolver(goalInsertSchema),
    defaultValues: { title: "", target_date: "" },
  });

  useEffect(() => {
    if (state.success) {
      form.reset({ title: "", target_date: "" });
    }
  }, [state, form]);

  function onSubmit(values: GoalInsertInput) {
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.target_date) formData.append("target_date", values.target_date);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1.5" noValidate>
      <div className="flex items-start gap-2">
        <Input aria-label="Goal title" placeholder="Add a goal…" {...form.register("title")} />
        <Controller
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <DatePicker
              label="Target date"
              placeholder="Target date"
              className="w-44 shrink-0"
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <Button type="submit" disabled={isPending}>
          <Plus />
          {isPending ? "Adding…" : "Add goal"}
        </Button>
      </div>
      {(form.formState.errors.title || form.formState.errors.target_date || state.error) && (
        <p className="text-caption text-pink-ink">
          {form.formState.errors.title?.message ??
            form.formState.errors.target_date?.message ??
            state.error}
        </p>
      )}
    </form>
  );
}
