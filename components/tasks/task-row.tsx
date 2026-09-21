"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteTask, toggleTask } from "@/actions/tasks";
import { formatDueDate, isOverdue } from "@/lib/dates";
import type { Tables } from "@/lib/types/database";

export function TaskRow({ task }: { task: Tables<"tasks"> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(checked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleTask(task.id, checked);
      if (!result.success) setError(result.error ?? "Couldn't update the task. Try again.");
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.success) setError(result.error ?? "Couldn't delete the task. Try again.");
    });
  }

  const overdue = !task.is_completed && task.due_date !== null && isOverdue(task.due_date);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-surface-100 px-4 py-3",
        isPending && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={task.is_completed ? "Mark as not done" : "Mark as done"}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span
          className={`text-body ${
            task.is_completed ? "text-ink-faint line-through" : "text-ink"
          }`}
        >
          {task.title}
        </span>
        {task.due_date && (
          <span className={`text-caption ${overdue ? "text-pink-ink" : "text-ink-muted"}`}>
            Due {formatDueDate(task.due_date)}
          </span>
        )}
        {error && <span className="text-caption text-pink-ink">{error}</span>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Delete task"
        className="rounded-sm text-ink-faint outline-none transition-colors hover:text-pink-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
