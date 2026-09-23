import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { CatalogItem, CatalogKind } from "@/lib/fitness/catalog";
import type { Database } from "@/lib/types/database";

// Read helpers for the fitness screens. Each takes the caller's Supabase client, so RLS
// scopes every read to their own rows. A failed read is logged (static context, no
// row values) and comes back empty rather than throwing into the page.

type Client = SupabaseClient<Database>;

export type ExerciseWithTags = {
  id: string;
  name: string;
  exerciseType: string;
  isActive: boolean;
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
};

type TagRow = { id: string; name: string; is_active: boolean };

function byName(a: CatalogItem, b: CatalogItem): number {
  return a.name.localeCompare(b.name);
}

function toTags(rows: TagRow[]): CatalogItem[] {
  return rows.map((row) => ({ id: row.id, name: row.name, isActive: row.is_active })).sort(byName);
}

// Every exercise with its muscle groups and equipment, archived tags included when the
// exercise is still tagged with them (a tag's archived state does not remove it).
export async function getExercisesWithTags(supabase: Client): Promise<ExerciseWithTags[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, exercise_type, is_active, exercise_muscle_groups(muscle_groups(id, name, is_active)), exercise_equipment(equipment(id, name, is_active))"
    )
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    logError("Load exercises with tags", error);
    return [];
  }

  return (data ?? []).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    exerciseType: exercise.exercise_type,
    isActive: exercise.is_active,
    muscleGroups: toTags(
      exercise.exercise_muscle_groups.flatMap((link) => (link.muscle_groups ? [link.muscle_groups] : []))
    ),
    equipment: toTags(
      exercise.exercise_equipment.flatMap((link) => (link.equipment ? [link.equipment] : []))
    ),
  }));
}

// A user's muscle groups or equipment by name. Pickers ask for the active ones only;
// the management list passes `includeArchived`.
export async function getCatalogItems(
  supabase: Client,
  kind: CatalogKind,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<CatalogItem[]> {
  const query = supabase.from(kind).select("id, name, is_active").order("name", { ascending: true });
  const { data, error } = await (includeArchived ? query : query.eq("is_active", true));

  if (error) {
    logError(`Load ${kind}`, error);
    return [];
  }

  return toTags(data ?? []);
}

export type PastLogSet = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

export type PastLogExercise = {
  // null for an exercise that is no longer (or was never) part of the workout.
  workoutExerciseId: string | null;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  targetSets: number | null;
  targetReps: string | null;
  // This log's sets for the exercise, by set number; empty when none were logged.
  sets: PastLogSet[];
  // Sets were logged for it, but the workout has since dropped the exercise.
  removedFromWorkout: boolean;
};

export type PastWorkoutLog = {
  id: string;
  workoutId: string | null;
  // The workout's current name; null for an ad hoc log (no workout).
  workoutName: string | null;
  performedOn: string;
  performedAt: string;
  notes: string | null;
  exercises: PastLogExercise[];
};

type LoggedSet = PastLogSet & { exerciseId: string; exerciseName: string; exerciseType: string; createdAt: string };

const bySetNumber = (sets: LoggedSet[]): LoggedSet[] =>
  [...sets].sort((a, b) => a.setNumber - b.setNumber);

// A past workout log as it is now: the workout's live name and current exercises in
// order, each with the sets this log recorded for it, then any exercise that has sets in
// this log but has since been removed from the workout (flagged), oldest first. An
// exercise listed twice in the workout shows its sets under its first row only. An ad hoc
// log (no workout) returns just its own sets, none flagged. Null when there is no such log.
export async function getPastWorkoutLog(supabase: Client, logId: string): Promise<PastWorkoutLog | null> {
  const { data: log, error: loadError } = await supabase
    .from("workout_logs")
    .select("id, workout_id, performed_on, performed_at, notes, workouts(name)")
    .eq("id", logId)
    .maybeSingle();

  if (loadError) logError("Load past workout log", loadError);
  if (!log) return null;

  const [workoutExercises, setLogs] = await Promise.all([
    log.workout_id
      ? supabase
          .from("workout_exercises")
          .select("id, exercise_id, target_sets, target_reps, exercises(name, exercise_type)")
          .eq("workout_id", log.workout_id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("set_logs")
      .select(
        "id, exercise_id, set_number, weight, reps, duration_seconds, created_at, exercises(name, exercise_type)"
      )
      .eq("workout_log_id", logId)
      .order("set_number", { ascending: true }),
  ]);

  if (workoutExercises.error) logError("Load past log workout exercises", workoutExercises.error);
  if (setLogs.error) logError("Load past log sets", setLogs.error);

  const setsByExercise = new Map<string, LoggedSet[]>();
  for (const row of setLogs.data ?? []) {
    const sets = setsByExercise.get(row.exercise_id) ?? [];
    sets.push({
      id: row.id,
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
      durationSeconds: row.duration_seconds,
      exerciseId: row.exercise_id,
      exerciseName: row.exercises?.name ?? "Exercise",
      exerciseType: row.exercises?.exercise_type ?? "weight_training",
      createdAt: row.created_at,
    });
    setsByExercise.set(row.exercise_id, sets);
  }

  const toSet = ({ id, setNumber, weight, reps, durationSeconds }: LoggedSet): PastLogSet => ({
    id,
    setNumber,
    weight,
    reps,
    durationSeconds,
  });

  const exercises: PastLogExercise[] = [];
  const shown = new Set<string>();

  for (const row of workoutExercises.data ?? []) {
    const firstOccurrence = !shown.has(row.exercise_id);
    shown.add(row.exercise_id);
    exercises.push({
      workoutExerciseId: row.id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercises?.name ?? "Exercise",
      exerciseType: row.exercises?.exercise_type ?? "weight_training",
      targetSets: row.target_sets,
      targetReps: row.target_reps,
      sets: firstOccurrence ? bySetNumber(setsByExercise.get(row.exercise_id) ?? []).map(toSet) : [],
      removedFromWorkout: false,
    });
  }

  const orphaned = [...setsByExercise.values()]
    .filter((sets) => !shown.has(sets[0].exerciseId))
    .map((sets) => ({
      sets,
      first: sets.reduce((a, b) => (b.createdAt < a.createdAt ? b : a)),
    }))
    .sort((a, b) => a.first.createdAt.localeCompare(b.first.createdAt));

  for (const { sets, first } of orphaned) {
    exercises.push({
      workoutExerciseId: null,
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      exerciseType: first.exerciseType,
      targetSets: null,
      targetReps: null,
      sets: bySetNumber(sets).map(toSet),
      // An ad hoc log has no workout to have been removed from.
      removedFromWorkout: log.workout_id !== null,
    });
  }

  return {
    id: log.id,
    workoutId: log.workout_id,
    workoutName: log.workouts?.name ?? null,
    performedOn: log.performed_on,
    performedAt: log.performed_at,
    notes: log.notes,
    exercises,
  };
}
