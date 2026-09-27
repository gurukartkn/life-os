import { format, parseISO } from "date-fns";
import { TodaySpendingCard } from "@/components/finance/today-spending-card";
import { TodayGoalsCard } from "@/components/goals/today-goals-card";
import { PageHeader } from "@/components/ui/page-header";
import { todayIso } from "@/lib/dates";
import { getTodaySpending } from "@/lib/queries/finance";
import { getTodayGoals } from "@/lib/queries/goals";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

// The Today dashboard (Today dashboard board). Stages 5a and 5b ship its Goals and
// Spending cards; the stat row and the Tasks and Routines cards come with the
// dashboard's own stage, so this route is not in the sidebar yet and "/" still opens Tasks.
export default async function TodayPage() {
  const supabase = await createClient();
  const timeZone = await getUserTimezone(supabase);
  const today = todayIso(timeZone);
  const [{ goals, error }, spending] = await Promise.all([getTodayGoals(supabase), getTodaySpending(supabase, today)]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Today" description={format(parseISO(today), "EEEE, d MMMM")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:col-start-2">
          <TodayGoalsCard goals={goals} loadError={error} />
          {(spending.error || spending.spending) && (
            <TodaySpendingCard spending={spending.spending} loadError={spending.error} />
          )}
        </div>
      </div>
    </div>
  );
}
