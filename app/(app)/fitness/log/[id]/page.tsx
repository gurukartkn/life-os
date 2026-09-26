import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logError as logLoadError } from "@/lib/errors";
import { formatClockTime } from "@/lib/dates";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { WorkoutLogSession, type ExerciseCardData } from "@/components/fitness/workout-log-session";
import { LinkGoalForm } from "@/components/fitness/link-goal-form";
import type { SetData } from "@/components/fitness/set-row";

type WorkoutLogRow = {
  id: string;
  workout_id: string | null;
  created_at: string;
  workouts: { id: string; name: string } | null;
};

type WorkoutExerciseRow = {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps: string | null;
  exercises: {
    name: string;
    exercise_type: string;
    exercise_muscle_groups: { muscle_groups: { name: string } | null }[];
  } | null;
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

  const [{ data: logData, error: logError }, timeZone] = await Promise.all([
    supabase.from("workout_logs").select("id, workout_id, created_at, workouts(id, name)").eq("id", id).maybeSingle(),
    getUserTimezone(supabase),
  ]);

  if (logError) logLoadError("Load workout log", logError);
  const log = logData as unknown as WorkoutLogRow | null;
  if (!log) notFound();

  const [{ data: workoutExercisesData, error: exercisesError }, { data: setLogsData, error: setLogsError }, { data: goalsData }, { data: linkData }] =
    await Promise.all([
      log.workout_id
        ? supabase
            .from("workout_exercises")
            .select(
              "id, exercise_id, target_sets, target_reps, exercises(name, exercise_type, exercise_muscle_groups(muscle_groups(name)))"
            )
            .eq("workout_id", log.workout_id)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as WorkoutExerciseRow[], error: null }),
      supabase.from("set_logs").select("id, exercise_id, set_number, weight, reps, duration_seconds").eq("workout_log_id", id),
      supabase.from("goals").select("id, title").order("created_at", { ascending: false }),
      supabase
        .from("links")
        .select("id, target_id")
        .eq("source_type", "workout_log")
        .eq("source_id", id)
        .eq("target_type", "goal")
        .maybeSingle(),
    ]);

  if (exercisesError) logLoadError("Load workout exercises", exercisesError);
  if (setLogsError) logLoadError("Load set logs", setLogsError);
  const workoutExercises = (workoutExercisesData ?? []) as unknown as WorkoutExerciseRow[];
  const setLogs = (setLogsData ?? []) as SetLogRow[];
  const goals = goalsData ?? [];

  // One row per target set (at least one), plus any set logged beyond the target.
  const exerciseCards: ExerciseCardData[] = workoutExercises.map((we) => {
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
    return {
      workoutExerciseId: we.id,
      exerciseId: we.exercise_id,
      exerciseName: we.exercises?.name ?? "Exercise",
      exerciseType: we.exercises?.exercise_type ?? "weight_training",
      muscleGroups:
        we.exercises?.exercise_muscle_groups.flatMap((link) => (link.muscle_groups ? [link.muscle_groups.name] : [])) ?? [],
      targetSets: we.target_sets,
      targetReps: we.target_reps,
      sets,
    };
  });

  return (
    <WorkoutLogSession
      workoutLogId={log.id}
      workoutName={log.workouts?.name ?? "Ad-hoc workout"}
      startedLabel={`Started ${formatClockTime(log.created_at, timeZone)}`}
      startedAt={log.created_at}
      exerciseCards={exerciseCards}
    >
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
