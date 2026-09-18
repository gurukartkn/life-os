import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, title, cadence")
    .eq("id", id)
    .maybeSingle();

  if (routineError) console.error("Failed to load routine:", routineError);
  if (!routine) notFound();

  const periodStart = periodStartFor(routine.cadence);

  const { data: itemsData, error: itemsError } = await supabase
    .from("routine_items")
    .select("id, title")
    .eq("routine_id", id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (itemsError) console.error("Failed to load routine items:", itemsError);
  const items = itemsData ?? [];
  const itemIds = items.map((item) => item.id);

  const { data: completionsData } =
    itemIds.length > 0
      ? await supabase
          .from("routine_completions")
          .select("routine_item_id")
          .eq("period_start", periodStart)
          .in("routine_item_id", itemIds)
      : { data: [] as { routine_item_id: string }[] };

  const completedIds = new Set((completionsData ?? []).map((c) => c.routine_item_id));

  const checklistItems: RoutineItemData[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    checked: completedIds.has(item.id),
  }));

  const { data: goalsData } = await supabase
    .from("goals")
    .select("id, title")
    .order("created_at", { ascending: false });
  const goals = goalsData ?? [];

  const { data: linkData } = await supabase
    .from("links")
    .select("id, target_id")
    .eq("source_type", "routine")
    .eq("source_id", id)
    .eq("target_type", "goal")
    .maybeSingle();

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
