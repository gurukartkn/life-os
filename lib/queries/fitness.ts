import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import type { CatalogItem, CatalogKind } from "@/lib/fitness/catalog";
import { sessionMinutes } from "@/lib/fitness/labels";
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
  return (await loadExercisesWithTags(supabase)).exercises;
}

// The same read, also saying whether it failed — for a screen that shows a
// load-failed state rather than an empty one.
export async function loadExercisesWithTags(
  supabase: Client
): Promise<{ exercises: ExerciseWithTags[]; error: boolean }> {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, exercise_type, is_active, exercise_muscle_groups(muscle_groups(id, name, is_active)), exercise_equipment(equipment(id, name, is_active))"
    )
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    logError("Load exercises with tags", error);
    return { exercises: [], error: true };
  }

  const exercises = (data ?? []).map((exercise) => ({
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
  return { exercises, error: false };
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

// How many exercises use each muscle group / equipment item (archived exercises
// included — their links still block a delete). Keyed by item id; unused items are absent.
export async function getCatalogUsage(supabase: Client, kind: CatalogKind): Promise<Record<string, number>> {
  const { data, error } =
    kind === "muscle_groups"
      ? await supabase.from("exercise_muscle_groups").select("item_id:muscle_group_id")
      : await supabase.from("exercise_equipment").select("item_id:equipment_id");

  if (error) {
    logError(`Load ${kind} usage`, error);
    return {};
  }

  const usage: Record<string, number> = {};
  for (const row of (data ?? []) as { item_id: string }[]) {
    usage[row.item_id] = (usage[row.item_id] ?? 0) + 1;
  }
  return usage;
}

export type WorkoutSummary = {
  id: string;
  name: string;
  exerciseCount: number;
  // Up to three muscle groups across the workout's exercises, in order of first use.
  muscleGroups: string[];
  lastDone: string | null;
};

type WorkoutSummaryRow = {
  id: string;
  name: string;
  workout_exercises: {
    sort_order: number;
    exercises: { exercise_muscle_groups: { muscle_groups: { name: string } | null }[] } | null;
  }[];
  workout_logs: { performed_at: string }[];
};

// "Your workouts": each workout with its size, main muscle groups and when it was last
// done. `error` is set when the read failed, so the page can show the load-failed state.
export async function getWorkoutSummaries(
  supabase: Client
): Promise<{ workouts: WorkoutSummary[]; error: boolean }> {
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, name, workout_exercises(sort_order, exercises(exercise_muscle_groups(muscle_groups(name)))), workout_logs(performed_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    logError("Load workouts", error);
    return { workouts: [], error: true };
  }

  const workouts = ((data ?? []) as unknown as WorkoutSummaryRow[]).map((workout) => {
    const ordered = [...workout.workout_exercises].sort((a, b) => a.sort_order - b.sort_order);
    const muscleGroups = Array.from(
      new Set(
        ordered.flatMap(
          (we) =>
            we.exercises?.exercise_muscle_groups.flatMap((link) =>
              link.muscle_groups ? [link.muscle_groups.name] : []
            ) ?? []
        )
      )
    ).slice(0, 3);
    // Compared as instants: performed_at is a timestamp, and its text form can vary in length.
    const lastDone = workout.workout_logs.reduce<string | null>(
      (latest, log) =>
        !latest || new Date(log.performed_at).getTime() > new Date(latest).getTime() ? log.performed_at : latest,
      null
    );
    return { id: workout.id, name: workout.name, exerciseCount: ordered.length, muscleGroups, lastDone };
  });

  return { workouts, error: false };
}

export type RecentSession = {
  id: string;
  workoutName: string;
  performedAt: string;
  minutes: number | null;
  setCount: number;
};

type RecentSessionRow = {
  id: string;
  performed_at: string;
  created_at: string;
  workouts: { name: string } | null;
  set_logs: { count: number }[];
};

// "Recent sessions": the latest logs with their length (start = the row's creation,
// finish = performed_at, which finishWorkoutLog restamps) and how many sets they hold.
export async function getRecentSessions(supabase: Client, limit = 5): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("id, performed_at, created_at, workouts(name), set_logs(count)")
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("Load recent sessions", error);
    return [];
  }

  return ((data ?? []) as unknown as RecentSessionRow[]).map((log) => ({
    id: log.id,
    workoutName: log.workouts?.name ?? "Ad-hoc workout",
    performedAt: log.performed_at,
    minutes: sessionMinutes(log.created_at, log.performed_at),
    setCount: log.set_logs[0]?.count ?? 0,
  }));
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
  muscleGroups: string[];
  // This log's sets for the exercise, by set number; empty when none were logged.
  sets: PastLogSet[];
  // Sets were logged for it, but the workout has since dropped the exercise.
  removedFromWorkout: boolean;
  // It joined the workout after this session finished, so the session could not log it.
  addedAfterSession: boolean;
};

export type PastWorkoutLog = {
  id: string;
  workoutId: string | null;
  // The workout's current name; null for an ad hoc log (no workout).
  workoutName: string | null;
  performedOn: string;
  // When the session finished; startedAt is the log row's creation.
  performedAt: string;
  startedAt: string;
  notes: string | null;
  setCount: number;
  exercises: PastLogExercise[];
};

type LoggedSet = PastLogSet & {
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  muscleGroups: string[];
  createdAt: string;
};

type MuscleGroupLinks = { exercise_muscle_groups: { muscle_groups: { name: string } | null }[] } | null;

const muscleGroupNames = (exercise: MuscleGroupLinks): string[] =>
  exercise?.exercise_muscle_groups?.flatMap((link) => (link.muscle_groups ? [link.muscle_groups.name] : [])) ?? [];

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
    .select("id, workout_id, performed_on, performed_at, created_at, notes, workouts(name)")
    .eq("id", logId)
    .maybeSingle();

  if (loadError) logError("Load past workout log", loadError);
  if (!log) return null;

  const [workoutExercises, setLogs] = await Promise.all([
    log.workout_id
      ? supabase
          .from("workout_exercises")
          .select(
            "id, exercise_id, target_sets, target_reps, created_at, exercises(name, exercise_type, exercise_muscle_groups(muscle_groups(name)))"
          )
          .eq("workout_id", log.workout_id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("set_logs")
      .select(
        "id, exercise_id, set_number, weight, reps, duration_seconds, created_at, exercises(name, exercise_type, exercise_muscle_groups(muscle_groups(name)))"
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
      muscleGroups: muscleGroupNames(row.exercises as MuscleGroupLinks),
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
      muscleGroups: muscleGroupNames(row.exercises as MuscleGroupLinks),
      sets: firstOccurrence ? bySetNumber(setsByExercise.get(row.exercise_id) ?? []).map(toSet) : [],
      removedFromWorkout: false,
      addedAfterSession: new Date(row.created_at).getTime() > new Date(log.performed_at).getTime(),
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
      muscleGroups: first.muscleGroups,
      sets: bySetNumber(sets).map(toSet),
      // An ad hoc log has no workout to have been removed from.
      removedFromWorkout: log.workout_id !== null,
      addedAfterSession: false,
    });
  }

  return {
    id: log.id,
    workoutId: log.workout_id,
    workoutName: log.workouts?.name ?? null,
    performedOn: log.performed_on,
    performedAt: log.performed_at,
    startedAt: log.created_at,
    notes: log.notes,
    setCount: setLogs.data?.length ?? 0,
    exercises,
  };
}
