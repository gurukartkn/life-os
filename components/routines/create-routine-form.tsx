"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createRoutine } from "@/actions/routines";
import { createRoutineSchema, type CreateRoutineInput } from "@/lib/validations/routines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY_ITEM = { title: "" };

export function CreateRoutineForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateRoutineInput>({
    resolver: zodResolver(createRoutineSchema),
    defaultValues: { title: "", cadence: "daily", items: [EMPTY_ITEM] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  function onSubmit(values: CreateRoutineInput) {
    startTransition(async () => {
      const result = await createRoutine(values);
      if (result && !result.success) {
        form.setError("root", {
          message: result.error ?? "Couldn't create the routine. Try again.",
        });
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="routine-title">Title</Label>
        <Input id="routine-title" placeholder="Morning routine" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-caption text-pink-ink">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="routine-cadence">Cadence</Label>
        <select
          id="routine-cadence"
          className="h-8 w-40 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("cadence")}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Items</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <Input
              aria-label={`Item ${index + 1}`}
              placeholder="e.g. Meditate"
              {...form.register(`items.${index}.title` as const)}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              aria-label="Remove item"
              className="flex h-8 items-center text-ink-faint transition-colors hover:text-pink-ink disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append(EMPTY_ITEM)}
          className="text-button-text flex w-fit items-center gap-1.5 text-accent-text"
        >
          <Plus className="size-4" />
          Add item
        </button>
        {form.formState.errors.items?.message && (
          <p className="text-caption text-pink-ink">{form.formState.errors.items.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-caption text-pink-ink">{form.formState.errors.root.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" tone="blue" disabled={isPending}>
          {isPending ? "Creating…" : "Create routine"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/routines")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
