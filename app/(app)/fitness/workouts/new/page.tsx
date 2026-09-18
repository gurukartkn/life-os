import { CreateWorkoutForm } from "@/components/fitness/create-workout-form";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) logError("Load exercises", error);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-page-title text-ink">New workout</h1>
      <CreateWorkoutForm exercises={data ?? []} />
    </div>
  );
}
