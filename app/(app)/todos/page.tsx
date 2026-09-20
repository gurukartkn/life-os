import { AddTodoForm } from "@/components/todos/add-todo-form";
import { TodoStats } from "@/components/todos/todo-stats";
import { TodoView } from "@/components/todos/todo-view";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { todayIso } from "@/lib/dates";
import type { Tables } from "@/lib/types/database";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("is_completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    logError("Load todos", error);
  }

  const todos: Tables<"todos">[] = data ?? [];
  const today = todayIso();
  const dueTodayCount = todos.filter((t) => !t.is_completed && t.due_date === today).length;
  const overdueCount = todos.filter(
    (t) => !t.is_completed && t.due_date !== null && t.due_date < today
  ).length;
  const completedCount = todos.filter((t) => t.is_completed).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Today</h1>
      <TodoStats dueToday={dueTodayCount} overdue={overdueCount} completed={completedCount} />
      <AddTodoForm />
      <TodoView todos={todos} />
    </div>
  );
}
