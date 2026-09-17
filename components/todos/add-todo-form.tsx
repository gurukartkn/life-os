"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createTodo } from "@/actions/todos";
import { todoInsertSchema, type TodoInsertInput } from "@/lib/validations/todos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = { success: false };

export function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, initialState);
  const form = useForm<TodoInsertInput>({
    resolver: zodResolver(todoInsertSchema),
    defaultValues: { title: "", due_date: "" },
  });

  useEffect(() => {
    if (state.success) {
      form.reset({ title: "", due_date: "" });
    }
  }, [state, form]);

  function onSubmit(values: TodoInsertInput) {
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.due_date) formData.append("due_date", values.due_date);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1.5" noValidate>
      <div className="flex items-start gap-2">
        <Input
          aria-label="Todo title"
          placeholder="Add a todo…"
          {...form.register("title")}
        />
        <Input aria-label="Due date" type="date" className="w-40" {...form.register("due_date")} />
        <Button type="submit" disabled={isPending}>
          <Plus />
          {isPending ? "Adding…" : "Add todo"}
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
