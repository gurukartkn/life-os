import { WorkoutEditor } from "@/components/fitness/workout-editor";
import { getWorkoutEditorData } from "@/lib/fitness/editor-data";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { exercises, muscleGroups, equipment } = await getWorkoutEditorData(supabase);

  return (
    <WorkoutEditor
      workout={null}
      initialItems={[]}
      exercises={exercises}
      muscleGroups={muscleGroups}
      equipment={equipment}
    />
  );
}
