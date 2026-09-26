import { ExercisesView } from "@/components/fitness/exercises-view";
import { getCatalogItems, loadExercisesWithTags } from "@/lib/queries/fitness";
import { createClient } from "@/lib/supabase/server";

export default async function ExercisesPage() {
  const supabase = await createClient();
  // The form's pickers offer active catalog items only.
  const [{ exercises, error }, muscleGroups, equipment] = await Promise.all([
    loadExercisesWithTags(supabase),
    getCatalogItems(supabase, "muscle_groups"),
    getCatalogItems(supabase, "equipment"),
  ]);

  return (
    <ExercisesView exercises={exercises} muscleGroups={muscleGroups} equipment={equipment} loadError={error} />
  );
}
