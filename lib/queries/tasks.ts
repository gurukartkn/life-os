import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type TodayTask = { id: string; title: string; dueDate: string };

// Today's Tasks card: open tasks due today or earlier, overdue (earliest) first, capped
// at `limit`; `total` is how many there are in all. `error` when the read failed.
export async function getTodayTasks(
  supabase: Client,
  today: string,
  limit = 5
): Promise<{ tasks: TodayTask[]; total: number; error: boolean }> {
  const { data, count, error } = await supabase
    .from("tasks")
    .select("id, title, due_date", { count: "exact" })
    .eq("is_completed", false)
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("Load today tasks", error);
    return { tasks: [], total: 0, error: true };
  }

  const tasks = (data ?? []).map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date! }));
  return { tasks, total: count ?? tasks.length, error: false };
}
