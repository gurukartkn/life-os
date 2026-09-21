import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { RoutineList, type RoutineCardData } from "@/components/routines/routine-list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { periodStartFor } from "@/lib/dates";

export default async function RoutinesPage() {
  const supabase = await createClient();
  const dailyPeriod = periodStartFor("daily");
  const weeklyPeriod = periodStartFor("weekly");

  // Three independent reads, issued together (one round trip of wall-clock time,
  // not three). RLS already limits every table to this user, so items and
  // completions need no filtering by routine id here — each routine picks out its own below.
  const [
    { data: routinesData, error },
    { data: itemsData },
    { data: completionsData },
  ] = await Promise.all([
    supabase
      .from("routines")
      .select("id, title, cadence, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("routine_items").select("id, routine_id").eq("is_active", true),
    supabase
      .from("routine_completions")
      .select("routine_item_id, period_start")
      .in("period_start", [dailyPeriod, weeklyPeriod]),
  ]);

  if (error) logError("Load routines", error);

  const routines = routinesData ?? [];
  const items = itemsData ?? [];
  const completions = completionsData ?? [];

  const routineCards: RoutineCardData[] = routines.map((routine) => {
    const periodStart = routine.cadence === "weekly" ? weeklyPeriod : dailyPeriod;
    const routineItemIds = new Set(
      items.filter((item) => item.routine_id === routine.id).map((item) => item.id)
    );
    const totalCount = routineItemIds.size;
    const doneCount = completions.filter(
      (completion) =>
        routineItemIds.has(completion.routine_item_id) && completion.period_start === periodStart
    ).length;
    return { id: routine.id, title: routine.title, cadence: routine.cadence, totalCount, doneCount };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page-title text-ink">Routines</h1>
        <Link href="/routines/new" className={buttonVariants({ tone: "blue" })}>
          <Plus />
          New routine
        </Link>
      </div>

      {routineCards.length === 0 ? (
        <EmptyState icon={ListChecks} title="No routines yet." />
      ) : (
        <RoutineList routines={routineCards} />
      )}
    </div>
  );
}
