import { format, parseISO } from "date-fns";
import { TodayGoalsCard } from "@/components/goals/today-goals-card";
import { PageHeader } from "@/components/ui/page-header";
import { todayIso } from "@/lib/dates";
import { getTodayGoals } from "@/lib/queries/goals";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

// The Today dashboard (Today dashboard board). Stage 5a ships only its Goals card; the
// stat row and the Tasks, Routines and spending cards come with the dashboard's own stage,
// so this route is not in the sidebar yet and "/" still opens Tasks.
export default async function TodayPage() {
  const supabase = await createClient();
  const [{ goals, error }, timeZone] = await Promise.all([getTodayGoals(supabase), getUserTimezone(supabase)]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Today" description={format(parseISO(todayIso(timeZone)), "EEEE, d MMMM")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="lg:col-start-2">
          <TodayGoalsCard goals={goals} loadError={error} />
        </div>
      </div>
    </div>
  );
}
