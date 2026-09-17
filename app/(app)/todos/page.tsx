import { CalendarCheck } from "lucide-react";
import { AddTodoForm } from "@/components/todos/add-todo-form";
import { TodoFilters } from "@/components/todos/todo-filters";
import { TodoList } from "@/components/todos/todo-list";
import { TodoStats } from "@/components/todos/todo-stats";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/dates";
import type { Tables } from "@/lib/types/database";

type StatusFilter = "all" | "active" | "completed";

function parseStatusFilter(status: string | undefined): StatusFilter {
  return status === "active" || status === "completed" ? status : "all";
}

function emptyStateTitle(filter: StatusFilter): string {
  if (filter === "active") return "Nothing left to do.";
  if (filter === "completed") return "Nothing completed yet.";
  return "Nothing on the list today.";
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = parseStatusFilter(status);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("is_completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load todos:", error);
  }

  const todos: Tables<"todos">[] = data ?? [];
  const today = todayIso();
  const dueTodayCount = todos.filter((t) => !t.is_completed && t.due_date === today).length;
  const overdueCount = todos.filter(
    (t) => !t.is_completed && t.due_date !== null && t.due_date < today
  ).length;
  const completedCount = todos.filter((t) => t.is_completed).length;

  const visibleTodos = todos.filter((t) => {
    if (filter === "active") return !t.is_completed;
    if (filter === "completed") return t.is_completed;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Today</h1>
      <TodoStats dueToday={dueTodayCount} overdue={overdueCount} completed={completedCount} />
      <AddTodoForm />
      <TodoFilters active={filter} />
      {visibleTodos.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={emptyStateTitle(filter)} />
      ) : (
        <TodoList todos={visibleTodos} />
      )}
    </div>
  );
}
