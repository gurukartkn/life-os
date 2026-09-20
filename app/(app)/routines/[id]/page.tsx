import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { periodStartFor } from "@/lib/dates";
import { RoutineChecklist, type RoutineItemData } from "@/components/routines/routine-checklist";
import { AddRoutineItemForm } from "@/components/routines/add-routine-item-form";
import { DeleteRoutineButton } from "@/components/routines/delete-routine-button";
import { LinkGoalForm } from "@/components/routines/link-goal-form";
import { Tag } from "@/components/ui/tag";

const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
};

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const dailyPeriod = periodStartFor("daily");
  const weeklyPeriod = periodStartFor("weekly");

  // Five independent reads, issued together instead of one after another. The
  // completions read can't wait for the routine (it needs the cadence to know which
  // period counts), so it fetches both possible periods for this routine's items in
  // one call and the right one is picked below.
  const [
    { data: routine, error: routineError },
    { data: itemsData, error: itemsError },
    { data: completionsData },
    { data: goalsData },
    { data: linkData },
  ] = await Promise.all([
    supabase.from("routines").select("id, title, cadence").eq("id", id).maybeSingle(),
    supabase
      .from("routine_items")
      .select("id, title")
      .eq("routine_id", id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("routine_completions")
      .select("routine_item_id, period_start, routine_items!inner(routine_id)")
      .eq("routine_items.routine_id", id)
      .in("period_start", [dailyPeriod, weeklyPeriod]),
    supabase.from("goals").select("id, title").order("created_at", { ascending: false }),
    supabase
      .from("links")
      .select("id, target_id")
      .eq("source_type", "routine")
      .eq("source_id", id)
      .eq("target_type", "goal")
      .maybeSingle(),
  ]);

  if (routineError) logError("Load routine", routineError);
  if (!routine) notFound();
  if (itemsError) logError("Load routine items", itemsError);

  const periodStart = routine.cadence === "weekly" ? weeklyPeriod : dailyPeriod;
  const items = itemsData ?? [];
  const goals = goalsData ?? [];

  const completedIds = new Set(
    (completionsData ?? [])
      .filter((completion) => completion.period_start === periodStart)
      .map((completion) => completion.routine_item_id)
  );

  const checklistItems: RoutineItemData[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    checked: completedIds.has(item.id),
  }));

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-page-title text-ink">{routine.title}</h1>
          <Tag>{CADENCE_LABELS[routine.cadence] ?? routine.cadence}</Tag>
        </div>
        <DeleteRoutineButton id={routine.id} redirectTo="/routines" />
      </div>

      <LinkGoalForm
        routineId={routine.id}
        goals={goals.map((goal) => ({ id: goal.id, title: goal.title }))}
        linkedGoal={
          linkData
            ? {
                linkId: linkData.id,
                goalTitle: goals.find((goal) => goal.id === linkData.target_id)?.title ?? "Goal",
              }
            : null
        }
      />

      <RoutineChecklist items={checklistItems} periodStart={periodStart} routineId={routine.id} />

      <AddRoutineItemForm routineId={routine.id} />
    </div>
  );
}
