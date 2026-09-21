"use client";

import { CalendarCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { TodoFilters } from "@/components/todos/todo-filters";
import { TodoList } from "@/components/todos/todo-list";
import { EmptyState } from "@/components/ui/empty-state";
import { emptyStateTitle, filterTodos, parseStatusFilter } from "@/lib/todo-filters";
import type { Tables } from "@/lib/types/database";

// Filter tabs and the filtered list. The server sends every todo as props; the
// active filter comes from the URL (?status=…), so deep links and reloads render
// filtered on the first paint, and tab clicks re-filter in memory (todo-filters.tsx).
export function TodoView({ todos }: { todos: Tables<"todos">[] }) {
  const filter = parseStatusFilter(useSearchParams().get("status"));
  const visibleTodos = filterTodos(todos, filter);

  return (
    <>
      <TodoFilters active={filter} />
      {visibleTodos.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={emptyStateTitle(filter)} />
      ) : (
        <TodoList todos={visibleTodos} />
      )}
    </>
  );
}
