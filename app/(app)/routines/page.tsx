import { RoutinesToday } from "@/components/routines/routines-today";
import { todayIso } from "@/lib/dates";
import { getRoutinesToday } from "@/lib/queries/routines";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

export default async function RoutinesPage() {
  const supabase = await createClient();
  const timeZone = await getUserTimezone(supabase);
  // "Today" is the user's calendar day, not the server's (UTC on Vercel).
  const { data, error } = await getRoutinesToday(supabase, todayIso(timeZone), timeZone);

  return <RoutinesToday data={data} loadError={error} />;
}
