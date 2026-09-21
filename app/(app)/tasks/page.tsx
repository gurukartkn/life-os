import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskStats } from "@/components/tasks/task-stats";
import { TaskView } from "@/components/tasks/task-view";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { todayIso } from "@/lib/dates";
import type { Tables } from "@/lib/types/database";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("is_completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    logError("Load tasks", error);
  }

  const tasks: Tables<"tasks">[] = data ?? [];
  const today = todayIso();
  const dueTodayCount = tasks.filter((t) => !t.is_completed && t.due_date === today).length;
  const overdueCount = tasks.filter(
    (t) => !t.is_completed && t.due_date !== null && t.due_date < today
  ).length;
  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Tasks</h1>
      <TaskStats dueToday={dueTodayCount} overdue={overdueCount} completed={completedCount} />
      <AddTaskForm />
      <TaskView tasks={tasks} />
    </div>
  );
}
