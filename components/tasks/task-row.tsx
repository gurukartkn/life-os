"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDatePill } from "@/components/tasks/task-date-pill";
import { toggleTask } from "@/actions/tasks";
import type { Tables } from "@/lib/types/database";

// One 56px row of the task list card: checkbox, title, due-date pill and Edit.
export function TaskRow({ task, onEdit }: { task: Tables<"tasks">; onEdit: (task: Tables<"tasks">) => void }) {
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
        "flex min-h-14 items-center gap-3 border-b border-border px-4 py-2 last:border-b-0",
        isPending && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={task.is_completed ? "Mark as not done" : "Mark as done"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-ink">{task.title}</span>
        {error && <span className="text-caption text-pink-ink">{error}</span>}
      </div>
      <TaskDatePill dueDate={task.due_date} isCompleted={task.is_completed} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${task.title}`}
        onClick={() => onEdit(task)}
      >
        <Pencil strokeWidth={1.75} />
      </Button>
    </div>
  );
}
