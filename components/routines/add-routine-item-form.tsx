"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { addRoutineItem } from "@/actions/routines";
import { routineItemInsertSchema, type RoutineItemInsertInput } from "@/lib/validations/routines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddRoutineItemForm({ routineId }: { routineId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<RoutineItemInsertInput>({
    resolver: zodResolver(routineItemInsertSchema),
    defaultValues: { routine_id: routineId, title: "" },
  });

  function onSubmit(values: RoutineItemInsertInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await addRoutineItem(values);
      if (!result.success) {
        setServerError(result.error ?? "Couldn't add the item. Try again.");
        return;
      }
      form.reset({ routine_id: routineId, title: "" });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1.5" noValidate>
      <div className="flex items-start gap-2">
        <Input aria-label="Item title" placeholder="Add an item…" {...form.register("title")} />
        <Button type="submit" tone="blue" disabled={isPending}>
          <Plus />
          {isPending ? "Adding…" : "Add item"}
        </Button>
      </div>
      {(form.formState.errors.title || serverError) && (
        <p className="text-caption text-pink-ink">
          {form.formState.errors.title?.message ?? serverError}
        </p>
      )}
    </form>
  );
}
