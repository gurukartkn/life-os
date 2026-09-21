"use client";

import { CalendarCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskList } from "@/components/tasks/task-list";
import { EmptyState } from "@/components/ui/empty-state";
import { emptyStateTitle, filterTasks, parseStatusFilter } from "@/lib/task-filters";
import type { Tables } from "@/lib/types/database";

// Filter tabs and the filtered list. The server sends every task as props; the
// active filter comes from the URL (?status=…), so deep links and reloads render
// filtered on the first paint, and tab clicks re-filter in memory (task-filters.tsx).
export function TaskView({ tasks }: { tasks: Tables<"tasks">[] }) {
  const filter = parseStatusFilter(useSearchParams().get("status"));
  const visibleTasks = filterTasks(tasks, filter);

  return (
    <>
      <TaskFilters active={filter} />
      {visibleTasks.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={emptyStateTitle(filter)} />
      ) : (
        <TaskList tasks={visibleTasks} />
      )}
    </>
  );
}
