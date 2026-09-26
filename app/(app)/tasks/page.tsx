import { TaskView } from "@/components/tasks/task-view";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import type { Tables } from "@/lib/types/database";

export default async function TasksPage() {
  const supabase = await createClient();
  // Open tasks first; within them overdue (earliest dates) first, then by due date,
  // then undated — the order the Tasks board draws.
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

  return <TaskView tasks={tasks} loadError={Boolean(error)} />;
}
