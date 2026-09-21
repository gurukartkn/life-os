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

export function emptyStateTitle(filter: StatusFilter): string {
  if (filter === "active") return "Nothing left to do.";
  if (filter === "completed") return "Nothing completed yet.";
  return "Nothing on the list today.";
}
