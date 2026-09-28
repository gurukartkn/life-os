"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { validationFailure } from "@/lib/validations/field-errors";
import { displayNameSchema, timezoneSchema } from "@/lib/validations/profile";
import type { ActionResult } from "@/lib/types/action-result";

// The display name is Supabase Auth user_metadata (there is no profiles table). The
// session is refreshed afterwards so the JWT the shell reads its claims from carries
// the new name straight away rather than after the next token refresh.
export async function updateDisplayName(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = displayNameSchema.safeParse({ display_name: formData.get("display_name") });

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: parsed.data.display_name } });

  if (error) {
    logError("updateDisplayName", error);
    return { success: false, error: "Couldn't save your name. Try again." };
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) logError("updateDisplayName refresh", refreshError);

  revalidatePath("/", "layout");
  return { success: true };
}

// user_settings.timezone — the zone "today" and log dates are worked out in.
export async function updateTimezone(timezone: string): Promise<ActionResult> {
  const parsed = timezoneSchema.safeParse({ timezone });

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const { error } = await supabase
    .from("user_settings")
    .update({ timezone: parsed.data.timezone })
    .eq("user_id", user.id);

  if (error) {
    logError("updateTimezone", error);
    return { success: false, error: "Couldn't save your timezone. Try again." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
