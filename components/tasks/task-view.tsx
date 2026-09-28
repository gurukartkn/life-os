"use client";

import { useState } from "react";
import { CalendarCheck, CircleAlert, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createTask } from "@/actions/tasks";
import { EntityCreateDialog } from "@/components/entity/entity-create-dialog";
import { useEntityDrawer } from "@/components/entity/use-entity-drawer";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskFields, taskFormData } from "@/components/tasks/task-fields";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { emptyStateCopy, filterCounts, filterTasks, parseStatusFilter } from "@/lib/task-filters";
import { taskFormSchema } from "@/lib/validations/tasks";
import type { Tables } from "@/lib/types/database";

// The Tasks screen (Tasks board): header with Add task, filter tabs with counts, and
// the filtered list — or the empty / load-failed card. The server sends every task
// as props; the active filter (?status=…) and the open drawer (?view=task:<id>) come
// from the URL, so deep links and reloads render them on the first paint, and tab or
// row clicks only change the URL (task-filters.tsx, use-entity-drawer.ts).
export function TaskView({ tasks, loadError = false }: { tasks: Tables<"tasks">[]; loadError?: boolean }) {
  const filter = parseStatusFilter(useSearchParams().get("status"));
  const visibleTasks = filterTasks(tasks, filter);
  const [creating, setCreating] = useState(false);
  const drawer = useEntityDrawer("task");
  const viewedTask = drawer.view ? tasks.find((task) => task.id === drawer.view?.id) : undefined;

  // The drawer keeps showing the last task while it animates closed.
  const [shownTask, setShownTask] = useState(viewedTask);
  if (viewedTask && viewedTask !== shownTask) setShownTask(viewedTask);

  const addButton = (
    <Button type="button" onClick={() => setCreating(true)}>
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
    content = <TaskList tasks={visibleTasks} onOpen={(task) => drawer.open("task", task.id)} />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Tasks" actions={addButton} />
      <div className="flex flex-col gap-4">
        <TaskFilters active={filter} counts={filterCounts(tasks)} />
        {content}
      </div>
      <EntityCreateDialog
        open={creating}
        onOpenChange={setCreating}
        title="New task"
        entityLabel="Task"
        schema={taskFormSchema}
        defaultValues={{ title: "", due_date: "" }}
        action={createTask}
        toFormData={(values) => taskFormData(values)}
      >
        {(form) => <TaskFields form={form} />}
      </EntityCreateDialog>
      {shownTask && <TaskDrawer task={shownTask} open={Boolean(viewedTask)} onClose={drawer.close} />}
    </div>
  );
}
