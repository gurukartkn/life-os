import { notFound } from "next/navigation";
import { GoalDetailView } from "@/components/goals/goal-detail-view";
import { todayIso } from "@/lib/dates";
import { getGoalDetail, getLinkPicker } from "@/lib/queries/goals";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";
import { goalIdSchema } from "@/lib/validations/goals";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!goalIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ detail, error }, { picker, error: pickerError }, timeZone] = await Promise.all([
    getGoalDetail(supabase, id),
    getLinkPicker(supabase, id),
    getUserTimezone(supabase),
  ]);

  // A goal that failed to load at all has nothing to show; one that is simply not the
  // caller's (or gone) is a 404, as RLS makes the two look the same.
  if (!detail) {
    if (error) throw new Error("Couldn't load the goal.");
    notFound();
  }

  return (
    <GoalDetailView detail={detail} picker={picker} today={todayIso(timeZone)} loadError={error || pickerError} />
  );
}
