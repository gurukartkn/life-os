import { GoalsView } from "@/components/goals/goals-view";
import { todayIso } from "@/lib/dates";
import { sortGoals } from "@/lib/goals";
import { listGoals } from "@/lib/queries/goals";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const supabase = await createClient();
  const [{ goals, error }, timeZone] = await Promise.all([listGoals(supabase), getUserTimezone(supabase)]);

  // "Today" is the user's calendar day, not the server's (UTC on Vercel).
  return <GoalsView goals={sortGoals(goals)} today={todayIso(timeZone)} loadError={error} />;
}
