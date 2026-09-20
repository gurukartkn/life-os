import type { Tables } from "@/lib/types/database";

export type StatusFilter = "all" | "active" | "completed";

// The status filter lives in the URL (?status=active). Anything unrecognised
// means "all", so a bad or missing param never blanks the list.
export function parseStatusFilter(status: string | null | undefined): StatusFilter {
  return status === "active" || status === "completed" ? status : "all";
}

export function filterHref(filter: StatusFilter): string {
  return filter === "all" ? "/todos" : `/todos?status=${filter}`;
}

// The page loads every todo, so a filter is a pure in-memory pass — no server round trip.
export function filterTodos(todos: Tables<"todos">[], filter: StatusFilter): Tables<"todos">[] {
  if (filter === "active") return todos.filter((todo) => !todo.is_completed);
  if (filter === "completed") return todos.filter((todo) => todo.is_completed);
  return todos;
}

export function emptyStateTitle(filter: StatusFilter): string {
  if (filter === "active") return "Nothing left to do.";
  if (filter === "completed") return "Nothing completed yet.";
  return "Nothing on the list today.";
}
