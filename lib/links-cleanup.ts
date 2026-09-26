import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { Database } from "@/lib/types/database";

// Links are polymorphic, so deleting a task or workout cascades nothing: its delete
// action removes the links pointing at it here, after the item itself is gone. A failure
// is only logged — the item is already deleted, and the goal screens read links through
// the item tables, so a leftover link is never shown or counted.
export async function deleteLinksTo(
  supabase: SupabaseClient<Database>,
  targetType: "task" | "workout",
  targetId: string
): Promise<void> {
  const { error } = await supabase
    .from("links")
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) logError(`Delete links to a ${targetType}`, error);
}
