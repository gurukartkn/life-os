import { notFound } from "next/navigation";
import { RoutineForm, type RoutineFormItem } from "@/components/routines/routine-form";
import { logError } from "@/lib/errors";
import type { Frequency, RepeatRule, TimeOfDay } from "@/lib/routines/schedule";
import { createClient } from "@/lib/supabase/server";

type ItemRow = {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  repeat_rule: string;
  repeat_every: number | null;
};

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes the read to the caller, so a missing row means "not found", not "not yours".
  const { data: routine, error } = await supabase
    .from("routines")
    .select(
      "id, title, time_of_day, frequency, times_per_week, weekdays, routine_items(id, title, sort_order, is_active, repeat_rule, repeat_every)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) logError("Load routine to edit", error);
  if (!routine) notFound();

  const rows = [...((routine.routine_items ?? []) as ItemRow[])].sort((a, b) => a.sort_order - b.sort_order);
  const items: RoutineFormItem[] = [...rows.filter((row) => row.is_active), ...rows.filter((row) => !row.is_active)].map(
    (row) => ({
      key: row.id,
      id: row.id,
      title: row.title,
      repeatRule: row.repeat_rule as RepeatRule,
      repeatEvery: row.repeat_every ?? 2,
      isActive: row.is_active,
    })
  );

  return (
    <RoutineForm
      routine={{
        id: routine.id,
        title: routine.title,
        timeOfDay: routine.time_of_day as TimeOfDay,
        frequency: routine.frequency as Frequency,
        timesPerWeek: routine.times_per_week,
        weekdays: routine.weekdays,
      }}
      initialItems={items}
    />
  );
}
