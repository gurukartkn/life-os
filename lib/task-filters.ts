import type { Tables } from "@/lib/types/database";

export type StatusFilter = "all" | "active" | "completed";

// The status filter lives in the URL (?status=active). Anything unrecognised
// means "all", so a bad or missing param never blanks the list.
export function parseStatusFilter(status: string | null | undefined): StatusFilter {
  return status === "active" || status === "completed" ? status : "all";
}

export function filterHref(filter: StatusFilter): string {
  return filter === "all" ? "/tasks" : `/tasks?status=${filter}`;
}

// The page loads every task, so a filter is a pure in-memory pass — no server round trip.
export function filterTasks(tasks: Tables<"tasks">[], filter: StatusFilter): Tables<"tasks">[] {
  if (filter === "active") return tasks.filter((task) => !task.is_completed);
  if (filter === "completed") return tasks.filter((task) => task.is_completed);
  return tasks;
}

export function filterCounts(tasks: Tables<"tasks">[]): Record<StatusFilter, number> {
  const completed = tasks.filter((task) => task.is_completed).length;
  return { all: tasks.length, active: tasks.length - completed, completed };
}

// The empty state for a filter. With no tasks at all it is the Tasks empty board's
// copy; a filter that happens to match nothing says so instead.
export function emptyStateCopy(
  filter: StatusFilter,
  hasAnyTasks: boolean
): { title: string; description: string } {
  if (!hasAnyTasks) return { title: "No tasks yet", description: "Add a task and it will show up here." };
  if (filter === "active") return { title: "Nothing left to do", description: "Every task is done." };
  return { title: "Nothing completed yet", description: "Tasks you tick off show up here." };
}
