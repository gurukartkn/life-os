"use client";

import { useCallback, useState } from "react";
import { CalendarCheck, CircleAlert, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { emptyStateCopy, filterCounts, filterTasks, parseStatusFilter } from "@/lib/task-filters";
import type { Tables } from "@/lib/types/database";

// The Tasks screen (Tasks board): header with Add task, filter tabs with counts, and
// the filtered list — or the empty / load-failed card. The server sends every task
// as props; the active filter comes from the URL (?status=…), so deep links and
// reloads render filtered on the first paint, and tab clicks re-filter in memory
// (task-filters.tsx). Add and Edit open the same modal.
export function TaskView({ tasks, loadError = false }: { tasks: Tables<"tasks">[]; loadError?: boolean }) {
  const filter = parseStatusFilter(useSearchParams().get("status"));
  const visibleTasks = filterTasks(tasks, filter);
  const [dialog, setDialog] = useState<{ open: boolean; task: Tables<"tasks"> | null }>({
    open: false,
    task: null,
  });

  const openNew = useCallback(() => setDialog({ open: true, task: null }), []);
  const openEdit = useCallback((task: Tables<"tasks">) => setDialog({ open: true, task }), []);
  const setOpen = useCallback((open: boolean) => setDialog((current) => ({ ...current, open })), []);

  const addButton = (
    <Button type="button" onClick={openNew}>
      <Plus strokeWidth={1.75} />
      Add task
    </Button>
  );

  let content: React.ReactNode;
  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load tasks"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (visibleTasks.length === 0) {
    const copy = emptyStateCopy(filter, tasks.length > 0);
    content = (
      <EmptyState
        icon={CalendarCheck}
        title={copy.title}
        description={copy.description}
        action={tasks.length === 0 ? addButton : undefined}
      />
    );
  } else {
    content = <TaskList tasks={visibleTasks} onEdit={openEdit} />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Tasks" actions={addButton} />
      <div className="flex flex-col gap-4">
        <TaskFilters active={filter} counts={filterCounts(tasks)} />
        {content}
      </div>
      <TaskFormDialog open={dialog.open} task={dialog.task} onOpenChange={setOpen} />
    </div>
  );
}
