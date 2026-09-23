import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPastWorkoutLog } from "@/lib/queries/fitness";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { PastLogView } from "@/components/fitness/past-log-view";

// The read-only view of a finished session — where "Finish workout" lands, and where
// Recent Logs links to, distinct from the editable /fitness/log/[id] active session.
export default async function PastWorkoutLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [log, timeZone] = await Promise.all([
    getPastWorkoutLog(supabase, id),
    getUserTimezone(supabase),
  ]);

  if (!log) notFound();

  return <PastLogView log={log} timeZone={timeZone} />;
}
