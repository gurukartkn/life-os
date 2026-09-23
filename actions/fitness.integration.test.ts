// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createWorkout, updateWorkout } from "@/actions/workouts";
import { startWorkoutLog, saveSetLog, finishWorkoutLog } from "@/actions/workout-logs";
import { createExerciseWithTags, updateExercise } from "@/actions/exercises";
import {
  archiveMuscleGroup,
  createMuscleGroup,
  createMuscleGroupInline,
  deleteMuscleGroup,
  renameMuscleGroup,
  restoreMuscleGroup,
} from "@/actions/muscle-groups";
import { getPastWorkoutLog } from "@/lib/queries/fitness";
import { todayIso } from "@/lib/dates";
import { emptyAccountEmail, loadEnvLocal } from "@/e2e/load-env";
import type { Database } from "@/lib/types/database";

// Runs the fitness actions against the real life-os-dev database, signed in as the dedicated
// e2e test accounts (see e2e/global-setup.ts). Skipped when .env.local has no credentials.
// It creates only rows named with RUN, and removes every one of them afterwards.

loadEnvLocal();

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => state.client) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

type Client = SupabaseClient<Database>;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const configured = Boolean(URL && ANON_KEY && EMAIL && PASSWORD);

const RUN = `it-${Date.now().toString(36)}`;

async function signIn(email: string): Promise<{ client: Client; userId: string }> {
  const client = createSupabaseClient<Database>(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD! });
  if (error || !data.user) throw new Error(`Could not sign in as ${email} (run Playwright once to create it)`);
  return { client, userId: data.user.id };
}

describe.skipIf(!configured)("fitness data layer against life-os-dev", () => {
  let me: Client;
  let myId: string;
  let other: Client;

  const exerciseIds: string[] = [];
  const workoutIds: string[] = [];
  const logIds: string[] = [];
  const muscleGroupIds: { client: () => Client; id: string }[] = [];

  const asMe = () => {
    state.client = me;
  };
  const asOther = () => {
    state.client = other;
  };

  async function makeExercise(name: string, muscleGroups: string[] = [], equipment: string[] = []) {
    asMe();
    const result = await createExerciseWithTags({
      name: `${RUN} ${name}`,
      exerciseType: "weight_training",
      muscleGroupIds: muscleGroups,
      equipmentIds: equipment,
    });
    expect(result.success).toBe(true);
    exerciseIds.push(result.data!.id);
    return result.data!.id;
  }

  async function makeMuscleGroup(name: string, who: "me" | "other" = "me") {
    if (who === "me") asMe();
    else asOther();
    const result = await createMuscleGroup({ name: `${RUN} ${name}` });
    expect(result.success).toBe(true);
    muscleGroupIds.push({ client: () => (who === "me" ? me : other), id: result.data!.id });
    return result.data!.id;
  }

  beforeAll(async () => {
    ({ client: me, userId: myId } = await signIn(EMAIL!));
    ({ client: other } = await signIn(emptyAccountEmail()));
  }, 30_000);

  afterAll(async () => {
    if (!me) return;
    // Children first: logs (and their sets), workouts (and their rows), exercises (and their
    // tag links), then the catalog rows those links pointed at.
    if (logIds.length) await me.from("workout_logs").delete().in("id", logIds);
    if (workoutIds.length) await me.from("workouts").delete().in("id", workoutIds);
    if (exerciseIds.length) await me.from("exercises").delete().in("id", exerciseIds);
    for (const { client, id } of muscleGroupIds) await client().from("muscle_groups").delete().eq("id", id);
  }, 30_000);

  it("keeps every logged set and the log's link to its workout when the workout is edited", async () => {
    const bench = await makeExercise("Bench");
    const row = await makeExercise("Row");
    const fly = await makeExercise("Fly");

    // A workout with two exercises.
    asMe();
    await createWorkout({
      name: `${RUN} Push`,
      exercises: [
        { exercise_id: bench, target_sets: 2, target_reps: "8" },
        { exercise_id: row, target_sets: 2 },
      ],
    });
    const { data: workout } = await me.from("workouts").select("id").eq("name", `${RUN} Push`).single();
    const workoutId = workout!.id;
    workoutIds.push(workoutId);
    const { data: rows } = await me
      .from("workout_exercises")
      .select("id, exercise_id")
      .eq("workout_id", workoutId);
    const benchRowId = rows!.find((r) => r.exercise_id === bench)!.id;

    // A logged session with sets for both, then finished.
    const { redirect } = await import("next/navigation");
    const form = new FormData();
    form.set("workout_id", workoutId);
    await startWorkoutLog(form);
    const logId = String(vi.mocked(redirect).mock.calls.at(-1)?.[0]).split("/").pop()!;
    logIds.push(logId);

    const setsToLog = [
      { exercise_id: bench, set_number: 1, weight: 100, reps: 8 },
      { exercise_id: bench, set_number: 2, weight: 102.5, reps: 6 },
      { exercise_id: row, set_number: 1, weight: 60, reps: 10 },
      { exercise_id: row, set_number: 2, weight: 62.5, reps: 9 },
    ];
    for (const set of setsToLog) {
      expect(await saveSetLog({ workout_log_id: logId, ...set })).toEqual({ success: true });
    }
    const before = Date.now();
    expect(await finishWorkoutLog(logId)).toEqual({ success: true });

    const snapshot = async () => {
      const { data: sets } = await me
        .from("set_logs")
        .select("id, exercise_id, set_number, weight, reps, duration_seconds")
        .eq("workout_log_id", logId)
        .order("id");
      const { data: log } = await me
        .from("workout_logs")
        .select("workout_id, performed_at, performed_on")
        .eq("id", logId)
        .single();
      return { sets, log };
    };
    const beforeEdit = await snapshot();
    expect(beforeEdit.sets).toHaveLength(4);

    // Finishing stamped the instant and its date in the user's timezone.
    const { data: settings } = await me.from("user_settings").select("timezone").eq("user_id", myId).single();
    const finishedAt = new Date(beforeEdit.log!.performed_at);
    expect(finishedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(finishedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(beforeEdit.log!.performed_on).toBe(todayIso(settings!.timezone, finishedAt));

    // Edit: rename, remove Row, add Fly, reorder so Fly comes first.
    asMe();
    const updated = await updateWorkout({
      id: workoutId,
      name: `${RUN} Push (edited)`,
      items: [{ exerciseId: fly, targetSets: 3 }, { id: benchRowId, exerciseId: bench, targetSets: 2, targetReps: "8" }],
    });
    expect(updated).toEqual({ success: true });

    const afterEdit = await snapshot();
    expect(afterEdit.sets).toEqual(beforeEdit.sets); // every set, every value
    expect(afterEdit.log!.workout_id).toBe(workoutId); // the log is still attached to the same workout
    expect(afterEdit.log).toEqual(beforeEdit.log);

    const { data: edited } = await me.from("workouts").select("id, name").eq("id", workoutId).single();
    expect(edited).toEqual({ id: workoutId, name: `${RUN} Push (edited)` });

    const { data: currentRows } = await me
      .from("workout_exercises")
      .select("id, exercise_id, sort_order")
      .eq("workout_id", workoutId)
      .order("sort_order");
    expect(currentRows!.map((r) => [r.exercise_id, r.sort_order])).toEqual([
      [fly, 0],
      [bench, 1],
    ]);
    expect(currentRows![1].id).toBe(benchRowId); // the kept row was updated, not recreated

    const past = await getPastWorkoutLog(me, logId);
    expect(past?.workoutName).toBe(`${RUN} Push (edited)`);
    expect(past?.exercises.map((e) => [e.exerciseId, e.removedFromWorkout, e.sets.length])).toEqual([
      [fly, false, 0], // new exercise: no sets logged
      [bench, false, 2],
      [row, true, 2], // removed from the workout, but its sets are still shown
    ]);
    expect(past?.exercises[2].sets.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([
      [1, 60, 10],
      [2, 62.5, 9],
    ]);
  }, 60_000);

  it("replaces an exercise's tag sets on update", async () => {
    const a = await makeMuscleGroup("Chest");
    const b = await makeMuscleGroup("Triceps");
    const c = await makeMuscleGroup("Shoulders");
    const exercise = await makeExercise("Press", [a, b]);

    asMe();
    const result = await updateExercise({
      id: exercise,
      name: `${RUN} Press`,
      exerciseType: "weight_training",
      muscleGroupIds: [b, c],
      equipmentIds: [],
    });
    expect(result).toEqual({ success: true });

    const { data: links } = await me
      .from("exercise_muscle_groups")
      .select("muscle_group_id")
      .eq("exercise_id", exercise);
    expect(links!.map((l) => l.muscle_group_id).sort()).toEqual([b, c].sort());
  }, 30_000);

  it("rejects another user's muscle group id", async () => {
    const theirs = await makeMuscleGroup("Theirs", "other");
    const exercise = await makeExercise("Curl");

    asMe();
    const result = await updateExercise({
      id: exercise,
      name: `${RUN} Curl`,
      exerciseType: "weight_training",
      muscleGroupIds: [theirs],
      equipmentIds: [],
    });

    expect(result.success).toBe(false);
    const { data: links } = await me.from("exercise_muscle_groups").select("muscle_group_id").eq("exercise_id", exercise);
    expect(links).toEqual([]);
  }, 30_000);

  it("blocks delete while an exercise links to the item, allows it once none does, and archive/restore keep the row", async () => {
    const id = await makeMuscleGroup("Lats");
    const exercise = await makeExercise("Pulldown", [id]);

    asMe();
    expect(await deleteMuscleGroup(id)).toMatchObject({ success: false, code: "in_use" });

    expect(await archiveMuscleGroup(id)).toMatchObject({ success: true, data: { isActive: false } });
    expect(await restoreMuscleGroup(id)).toMatchObject({ success: true, data: { isActive: true } });
    const { data: stillThere } = await me.from("muscle_groups").select("id").eq("id", id);
    expect(stillThere).toHaveLength(1);

    await updateExercise({
      id: exercise,
      name: `${RUN} Pulldown`,
      exerciseType: "weight_training",
      muscleGroupIds: [],
      equipmentIds: [],
    });
    expect(await deleteMuscleGroup(id)).toEqual({ success: true });
    const { data: gone } = await me.from("muscle_groups").select("id").eq("id", id);
    expect(gone).toEqual([]);
  }, 30_000);

  it("refuses a case-only duplicate name on create and rename, and returns the existing item inline", async () => {
    const id = await makeMuscleGroup("Glutes");
    const otherId = await makeMuscleGroup("Hamstrings");

    asMe();
    expect(await createMuscleGroup({ name: `${RUN} GLUTES` })).toMatchObject({
      success: false,
      code: "duplicate_name",
    });
    expect(await renameMuscleGroup(otherId, `  ${RUN} glutes `)).toMatchObject({
      success: false,
      code: "duplicate_name",
    });
    expect(await createMuscleGroupInline({ name: `${RUN} gLuTeS` })).toMatchObject({
      success: true,
      data: { id, name: `${RUN} Glutes` },
    });
  }, 30_000);
});
