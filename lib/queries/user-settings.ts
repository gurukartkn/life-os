import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { Database } from "@/lib/types/database";

const FALLBACK_TIMEZONE = "UTC";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// The signed-in user's IANA timezone (user_settings.timezone, "UTC" by default). RLS
// scopes the read to their own row. A missing row, a failed read or an unrecognised
// zone falls back to UTC rather than failing whatever was being saved.
export async function getUserTimezone(supabase: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await supabase.from("user_settings").select("timezone").maybeSingle();

  if (error) {
    logError("Load user timezone", error);
    return FALLBACK_TIMEZONE;
  }

  const timeZone = data?.timezone;
  return timeZone && isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIMEZONE;
}
