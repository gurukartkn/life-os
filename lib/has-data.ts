import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { Database } from "@/lib/types/database";

// The tables a user creates rows in directly. Child tables (workout_exercises,
// set_logs, routine_items, …) can't exist without one of these parents, and
// `links` needs a goal/task/routine/workout log, so they add nothing. `user_settings`
// is left out on purpose: it is created at signup, so every account has one.
const USER_CONTENT_TABLES = [
  "tasks",
  "goals",
  "routines",
  "exercises",
  "workouts",
  "workout_logs",
] as const;

// Whether there is anything worth exporting. The probes run in parallel (one
// round trip in wall-clock time). If a probe fails we say "yes": hiding the
// export because of an error would be the worse mistake (anti-lock-in, FR-11).
export async function userHasData(supabase: SupabaseClient<Database>): Promise<boolean> {
  const results = await Promise.all(
    USER_CONTENT_TABLES.map((table) => supabase.from(table).select("id").limit(1))
  );

  const failed = results.find((result) => result.error);
  if (failed) {
    logError("userHasData", failed.error);
    return true;
  }

  return results.some((result) => (result.data?.length ?? 0) > 0);
}
