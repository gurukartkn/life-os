import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPastWorkoutLog } from "@/lib/queries/fitness";
import { PastLogView } from "@/components/fitness/past-log-view";

// The read-only view of a finished session — where "Finish workout" lands, and where
// Recent sessions links to, distinct from the editable /fitness/log/[id] active session.
export default async function PastWorkoutLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const log = await getPastWorkoutLog(supabase, id);

  if (!log) notFound();

  return <PastLogView log={log} />;
}
