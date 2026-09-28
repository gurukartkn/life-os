import { format, parseISO } from "date-fns";
import { TodayBoard } from "@/components/today/today-board";
import { PageHeader } from "@/components/ui/page-header";
import { todayIso } from "@/lib/dates";
import { getTodaySpending } from "@/lib/queries/finance";
import { getTodayWorkouts } from "@/lib/queries/fitness";
import { getTodayGoals } from "@/lib/queries/goals";
import { getRoutinesToday } from "@/lib/queries/routines";
import { getTodayTasks } from "@/lib/queries/tasks";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

// The Today dashboard (Today dashboard board): one card per module, laid out by
// TodayBoard from its TODAY_SECTIONS list. The stat row comes with the dashboard's own stage.
export default async function TodayPage() {
  const supabase = await createClient();
  const timeZone = await getUserTimezone(supabase);
  const today = todayIso(timeZone);
  const [tasks, routines, fitness, goals, spending] = await Promise.all([
    getTodayTasks(supabase, today),
    getRoutinesToday(supabase, today, timeZone),
    getTodayWorkouts(supabase, today),
    getTodayGoals(supabase),
    getTodaySpending(supabase, today),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Today" description={format(parseISO(today), "EEEE, d MMMM")} />
      <TodayBoard data={{ today, timeZone, tasks, routines, fitness, goals, spending }} />
    </div>
  );
}
