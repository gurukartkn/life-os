import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutLogSession } from "@/components/fitness/workout-log-session";
import { LinkGoalForm } from "@/components/fitness/link-goal-form";
import type { SetData } from "@/components/fitness/set-row";

type WorkoutLogRow = {
  id: string;
  workout_id: string | null;
  performed_on: string;
  workouts: { id: string; name: string } | null;
};

type WorkoutExerciseRow = {
  id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
  exercises: { name: string; exercise_type: string; muscle_groups: string[] } | null;
};

type SetLogRow = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
};

export default async function WorkoutLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: logData, error: logError } = await supabase
    .from("workout_logs")
    .select("id, workout_id, performed_on, workouts(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (logError) console.error("Failed to load workout log:", logError);
  const log = logData as unknown as WorkoutLogRow | null;
  if (!log) notFound();

  const { data: workoutExercisesData, error: exercisesError } = log.workout_id
    ? await supabase
        .from("workout_exercises")
        .select(
          "id, exercise_id, sort_order, target_sets, target_reps, exercises(name, exercise_type, muscle_groups)"
        )
        .eq("workout_id", log.workout_id)
        .order("sort_order", { ascending: true })
    : { data: [] as WorkoutExerciseRow[], error: null };

  if (exercisesError) console.error("Failed to load workout exercises:", exercisesError);
  const workoutExercises = (workoutExercisesData ?? []) as unknown as WorkoutExerciseRow[];

  const { data: setLogsData, error: setLogsError } = await supabase
    .from("set_logs")
    .select("id, exercise_id, set_number, weight, reps, duration_seconds")
    .eq("workout_log_id", id);

  if (setLogsError) console.error("Failed to load set logs:", setLogsError);
  const setLogs = (setLogsData ?? []) as SetLogRow[];

  const { data: goalsData } = await supabase
    .from("goals")
    .select("id, title")
    .order("created_at", { ascending: false });
  const goals = goalsData ?? [];

  const { data: linkData } = await supabase
    .from("links")
    .select("id, target_id")
    .eq("source_type", "workout_log")
    .eq("source_id", id)
    .eq("target_type", "goal")
    .maybeSingle();

  const exerciseCards = workoutExercises.map((we) => {
    const existing = setLogs.filter((s) => s.exercise_id === we.exercise_id);
    const maxSetNumber = existing.reduce((max, s) => Math.max(max, s.set_number), 0);
    const rowCount = Math.max(we.target_sets ?? 1, maxSetNumber, 1);
    const sets: SetData[] = Array.from({ length: rowCount }, (_, i) => {
      const setNumber = i + 1;
      const found = existing.find((s) => s.set_number === setNumber);
      return {
        id: found?.id ?? null,
        setNumber,
        weight: found?.weight ?? null,
        reps: found?.reps ?? null,
        durationSeconds: found?.duration_seconds ?? null,
      };
    });
    const savedCount = sets.filter((s) => s.id !== null).length;
    return {
      workoutExerciseId: we.id,
      exerciseId: we.exercise_id,
      exerciseName: we.exercises?.name ?? "Exercise",
      exerciseType: we.exercises?.exercise_type ?? "weight_training",
      muscleGroups: we.exercises?.muscle_groups ?? [],
      targetSets: we.target_sets,
      sets,
      savedCount,
    };
  });

  const workoutName = log.workouts?.name ?? "Ad-hoc workout";

  return (
    <WorkoutLogSession workoutLogId={log.id} workoutName={workoutName} exerciseCards={exerciseCards}>
      <LinkGoalForm
        workoutLogId={log.id}
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
    </WorkoutLogSession>
  );
}
