import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogItems, getExercisesWithTags, getPastWorkoutLog } from "@/lib/queries/fitness";
import { makeQueryBuilder, makeSupabaseMock, queryResult } from "@/lib/test/supabase-mock";
import type { Database } from "@/lib/types/database";

const LOG_ID = "11111111-1111-4a11-8b11-111111111111";
const WORKOUT_ID = "22222222-1111-4a11-8b11-111111111111";
const BENCH = "33333333-1111-4a11-8b11-111111111111";
const FLY = "44444444-1111-4a11-8b11-111111111111";
const ROW = "55555555-1111-4a11-8b11-111111111111";
const SQUAT = "66666666-1111-4a11-8b11-111111111111";

function clientWith(...results: ReturnType<typeof queryResult>[]) {
  const supabase = makeSupabaseMock();
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
  return { supabase, client: supabase as unknown as SupabaseClient<Database> };
}

const logRow = (workoutId: string | null, workoutName: string | null) =>
  queryResult({
    id: LOG_ID,
    workout_id: workoutId,
    performed_on: "2026-09-20",
    performed_at: "2026-09-20T08:00:00+00:00",
    notes: null,
    workouts: workoutName ? { name: workoutName } : null,
  });

const workoutExercise = (id: string, exerciseId: string, name: string) => ({
  id,
  exercise_id: exerciseId,
  target_sets: 3,
  target_reps: "8-10",
  exercises: { name, exercise_type: "weight_training" },
});

const setRow = (
  id: string,
  exerciseId: string,
  name: string,
  setNumber: number,
  createdAt: string,
  weight: number | null = 100,
  reps: number | null = 8
) => ({
  id,
  exercise_id: exerciseId,
  set_number: setNumber,
  weight,
  reps,
  duration_seconds: null,
  created_at: createdAt,
  exercises: { name, exercise_type: "weight_training" },
});

describe("getPastWorkoutLog", () => {
  it("returns the live workout name, current exercises in order with this log's sets, then removed exercises flagged", async () => {
    const { client } = clientWith(
      logRow(WORKOUT_ID, "Push Day (renamed)"),
      // The workout now: Fly first, Bench second. Squat was dropped, Row was dropped earlier than Squat's sets.
      queryResult([workoutExercise("w1", FLY, "Cable fly"), workoutExercise("w2", BENCH, "Bench press")]),
      queryResult([
        setRow("s1", BENCH, "Bench press", 2, "2026-09-20T08:10:00Z", 105, 6),
        setRow("s2", BENCH, "Bench press", 1, "2026-09-20T08:05:00Z", 100, 8),
        setRow("s3", SQUAT, "Squat", 1, "2026-09-20T08:30:00Z", 140, 5),
        setRow("s4", ROW, "Barbell row", 1, "2026-09-20T08:20:00Z", 80, 10),
      ])
    );

    const log = await getPastWorkoutLog(client, LOG_ID);

    expect(log).toMatchObject({
      id: LOG_ID,
      workoutId: WORKOUT_ID,
      workoutName: "Push Day (renamed)",
      performedOn: "2026-09-20",
      performedAt: "2026-09-20T08:00:00+00:00",
    });
    expect(log?.exercises.map((e) => [e.exerciseName, e.removedFromWorkout, e.workoutExerciseId])).toEqual([
      ["Cable fly", false, "w1"], // added since: no sets logged
      ["Bench press", false, "w2"],
      ["Barbell row", true, null], // removed, first set 08:20
      ["Squat", true, null], // removed, first set 08:30
    ]);
    expect(log?.exercises[0].sets).toEqual([]);
    expect(log?.exercises[1].sets.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([
      [1, 100, 8],
      [2, 105, 6],
    ]);
    expect(log?.exercises[1]).toMatchObject({ targetSets: 3, targetReps: "8-10" });
  });

  it("shows an exercise's sets under its first occurrence only when the workout lists it twice", async () => {
    const { client } = clientWith(
      logRow(WORKOUT_ID, "Push Day"),
      queryResult([workoutExercise("w1", BENCH, "Bench press"), workoutExercise("w2", BENCH, "Bench press")]),
      queryResult([setRow("s1", BENCH, "Bench press", 1, "2026-09-20T08:05:00Z")])
    );

    const log = await getPastWorkoutLog(client, LOG_ID);

    expect(log?.exercises.map((e) => [e.workoutExerciseId, e.sets.length])).toEqual([
      ["w1", 1],
      ["w2", 0],
    ]);
    expect(log?.exercises.every((e) => !e.removedFromWorkout)).toBe(true);
  });

  it("returns only its own sets, none flagged, for an ad hoc log (no workout)", async () => {
    const { supabase, client } = clientWith(
      logRow(null, null),
      queryResult([
        setRow("s1", SQUAT, "Squat", 1, "2026-09-20T08:30:00Z"),
        setRow("s2", BENCH, "Bench press", 1, "2026-09-20T08:05:00Z"),
      ])
    );

    const log = await getPastWorkoutLog(client, LOG_ID);

    expect(supabase.from).not.toHaveBeenCalledWith("workout_exercises");
    expect(log?.workoutId).toBeNull();
    expect(log?.workoutName).toBeNull();
    expect(log?.exercises.map((e) => [e.exerciseName, e.removedFromWorkout])).toEqual([
      ["Bench press", false],
      ["Squat", false],
    ]);
  });

  it("returns null when there is no such log", async () => {
    const { client } = clientWith(queryResult(null));

    expect(await getPastWorkoutLog(client, LOG_ID)).toBeNull();
  });
});

describe("getExercisesWithTags", () => {
  it("returns each exercise with its muscle groups and equipment, archived tags included, by name", async () => {
    const { client } = clientWith(
      queryResult([
        {
          id: BENCH,
          name: "Bench press",
          exercise_type: "weight_training",
          is_active: true,
          exercise_muscle_groups: [
            { muscle_groups: { id: "m2", name: "Triceps", is_active: true } },
            { muscle_groups: { id: "m1", name: "Chest", is_active: false } },
          ],
          exercise_equipment: [{ equipment: { id: "e1", name: "Barbell", is_active: true } }],
        },
        {
          id: FLY,
          name: "Cable fly",
          exercise_type: "weight_training",
          is_active: false,
          exercise_muscle_groups: [],
          exercise_equipment: [],
        },
      ])
    );

    const exercises = await getExercisesWithTags(client);

    expect(exercises).toEqual([
      {
        id: BENCH,
        name: "Bench press",
        exerciseType: "weight_training",
        isActive: true,
        muscleGroups: [
          { id: "m1", name: "Chest", isActive: false },
          { id: "m2", name: "Triceps", isActive: true },
        ],
        equipment: [{ id: "e1", name: "Barbell", isActive: true }],
      },
      {
        id: FLY,
        name: "Cable fly",
        exerciseType: "weight_training",
        isActive: false,
        muscleGroups: [],
        equipment: [],
      },
    ]);
  });
});

describe("getCatalogItems", () => {
  it("offers only active items to a picker", async () => {
    const { supabase, client } = clientWith(queryResult([{ id: "m1", name: "Chest", is_active: true }]));

    const items = await getCatalogItems(client, "muscle_groups");

    expect(supabase.from).toHaveBeenCalledWith("muscle_groups");
    expect(supabase.from.mock.results[0].value.eq).toHaveBeenCalledWith("is_active", true);
    expect(items).toEqual([{ id: "m1", name: "Chest", isActive: true }]);
  });

  it("includes archived items for the management list", async () => {
    const { supabase, client } = clientWith(queryResult([{ id: "e1", name: "Barbell", is_active: false }]));

    const items = await getCatalogItems(client, "equipment", { includeArchived: true });

    expect(supabase.from.mock.results[0].value.eq).not.toHaveBeenCalled();
    expect(items).toEqual([{ id: "e1", name: "Barbell", isActive: false }]);
  });
});
