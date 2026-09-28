"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDatePill } from "@/components/tasks/task-date-pill";
import { toggleTask } from "@/actions/tasks";
import type { Tables } from "@/lib/types/database";

// One 56px row of the task list card: checkbox, title and due-date pill. The title
// is a button whose hit area stretches over the whole row (except the checkbox, which
// sits above it), so clicking anywhere on the row opens the task's drawer.
export function TaskRow({ task, onOpen }: { task: Tables<"tasks">; onOpen: (task: Tables<"tasks">) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(checked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleTask(task.id, checked);
      if (!result.success) setError(result.error ?? "Couldn't update the task. Try again.");
    });
  }

  return (
    <div
      data-slot="task-row"
      className={cn(
        "relative flex min-h-14 items-center gap-3 border-b border-border px-4 py-2 transition-colors last:border-b-0 hover:bg-surface-200 has-[button[data-row-open]:focus-visible]:ring-2 has-[button[data-row-open]:focus-visible]:ring-ring has-[button[data-row-open]:focus-visible]:ring-inset",
        isPending && "opacity-60"
      )}
    >
      <Checkbox
        className="relative z-10"
        checked={task.is_completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={task.is_completed ? "Mark as not done" : "Mark as done"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          data-row-open=""
          onClick={() => onOpen(task)}
          className="truncate text-left text-body font-medium text-ink outline-none after:absolute after:inset-0"
        >
          {task.title}
        </button>
        {error && <span className="relative z-10 text-caption text-pink-ink">{error}</span>}
      </div>
      <TaskDatePill dueDate={task.due_date} isCompleted={task.is_completed} />
    </div>
  );
}
