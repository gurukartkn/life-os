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

  const { data: routinesData, error } = await supabase
    .from("routines")
    .select("id, title, cadence, created_at")
    .order("created_at", { ascending: false });

  if (error) logError("Load routines", error);

  const routines = routinesData ?? [];
  const routineIds = routines.map((routine) => routine.id);

  const { data: itemsData } =
    routineIds.length > 0
      ? await supabase
          .from("routine_items")
          .select("id, routine_id")
          .eq("is_active", true)
          .in("routine_id", routineIds)
      : { data: [] as { id: string; routine_id: string }[] };

  const items = itemsData ?? [];
  const itemIds = items.map((item) => item.id);
  const dailyPeriod = periodStartFor("daily");
  const weeklyPeriod = periodStartFor("weekly");

  const { data: completionsData } =
    itemIds.length > 0
      ? await supabase
          .from("routine_completions")
          .select("routine_item_id, period_start")
          .in("routine_item_id", itemIds)
          .in("period_start", [dailyPeriod, weeklyPeriod])
      : { data: [] as { routine_item_id: string; period_start: string }[] };

  const completions = completionsData ?? [];

  const routineCards: RoutineCardData[] = routines.map((routine) => {
    const periodStart = routine.cadence === "weekly" ? weeklyPeriod : dailyPeriod;
    const routineItemIds = items
      .filter((item) => item.routine_id === routine.id)
      .map((item) => item.id);
    const totalCount = routineItemIds.length;
    const doneCount = completions.filter(
      (completion) =>
        routineItemIds.includes(completion.routine_item_id) &&
        completion.period_start === periodStart
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
