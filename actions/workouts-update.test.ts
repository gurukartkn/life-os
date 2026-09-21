import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateWorkout } from "@/actions/workouts";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const EX_BENCH = "5b6f3d40-2222-4a11-8b11-222222222222";
const EX_ROW = "5b6f3d40-3333-4a11-8b11-333333333333";
const EX_FLY = "5b6f3d40-4444-4a11-8b11-444444444444";
const ROW_1 = "aaaaaaaa-1111-4a11-8b11-111111111111";
const ROW_2 = "bbbbbbbb-1111-4a11-8b11-111111111111";

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

function calls(table: string) {
  return supabase.from.mock.calls.flatMap(([name], index) =>
    name === table ? [supabase.from.mock.results[index].value] : []
  );
}

const loaded = queryResult({ id: WORKOUT_ID, workout_exercises: [{ id: ROW_1 }, { id: ROW_2 }] });

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("updateWorkout", () => {
  it("validates the input before touching Supabase", async () => {
    const empty = await updateWorkout({ id: WORKOUT_ID, name: "Push", items: [] });
    const blank = await updateWorkout({ id: WORKOUT_ID, name: "  ", items: [{ exerciseId: EX_BENCH }] });
    const twice = await updateWorkout({
      id: WORKOUT_ID,
      name: "Push",
      items: [
        { id: ROW_1, exerciseId: EX_BENCH },
        { id: ROW_1, exerciseId: EX_ROW },
      ],
    });

    expect(empty).toEqual({ success: false, error: "Add at least one exercise." });
    expect(blank).toEqual({ success: false, error: "Enter a name." });
    expect(twice.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reports a workout that does not exist, and writes nothing", async () => {
    queue(queryResult(null));

    const result = await updateWorkout({ id: WORKOUT_ID, name: "Push", items: [{ exerciseId: EX_BENCH }] });

    expect(result).toEqual({ success: false, error: "That workout no longer exists." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("refuses a kept row id that is not one of this workout's rows", async () => {
    queue(loaded);

    const result = await updateWorkout({
      id: WORKOUT_ID,
      name: "Push",
      items: [{ id: "cccccccc-1111-4a11-8b11-111111111111", exerciseId: EX_BENCH }],
    });

    expect(result).toEqual({ success: false, error: "One of the exercises isn't part of this workout." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("refuses an exercise that is not the caller's", async () => {
    queue(loaded, queryResult([{ id: EX_BENCH }]));

    const result = await updateWorkout({
      id: WORKOUT_ID,
      name: "Push",
      items: [{ exerciseId: EX_BENCH }, { exerciseId: EX_FLY }],
    });

    expect(result).toEqual({ success: false, error: "One of the selected exercises isn't available." });
    expect(calls("workouts")).toHaveLength(1); // the load only, no update
  });

  it("updates in place: one upsert for kept and new rows in list order, then deletes the dropped rows", async () => {
    const { revalidatePath } = await import("next/cache");
    queue(
      loaded,
      queryResult([{ id: EX_BENCH }, { id: EX_FLY }]), // both exercises are the caller's
      queryResult(null), // update the workouts row
      queryResult(null), // upsert
      queryResult(null) // delete dropped rows
    );

    const result = await updateWorkout({
      id: WORKOUT_ID,
      name: "  Push Day B ",
      notes: "  heavy ",
      // ROW_2 kept but moved first with new targets; ROW_1 dropped; a new row added.
      items: [
        { id: ROW_2, exerciseId: EX_BENCH, targetSets: 4, targetReps: "5" },
        { exerciseId: EX_FLY },
      ],
    });

    expect(result).toEqual({ success: true });

    const [, , workoutUpdate] = supabase.from.mock.results.map((r) => r.value);
    expect(supabase.from).toHaveBeenNthCalledWith(3, "workouts");
    expect(workoutUpdate.update).toHaveBeenCalledWith({
      name: "Push Day B",
      notes: "heavy",
      updated_at: expect.any(String),
    });
    expect(workoutUpdate.eq).toHaveBeenCalledWith("id", WORKOUT_ID);

    const [upsertCall, deleteCall] = calls("workout_exercises");
    expect(upsertCall.upsert).toHaveBeenCalledTimes(1);
    const [rows, options] = upsertCall.upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: "id" });
    expect(rows).toEqual([
      {
        id: ROW_2,
        workout_id: WORKOUT_ID,
        user_id: "user-1",
        exercise_id: EX_BENCH,
        sort_order: 0,
        target_sets: 4,
        target_reps: "5",
      },
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        workout_id: WORKOUT_ID,
        user_id: "user-1",
        exercise_id: EX_FLY,
        sort_order: 1,
        target_sets: null,
        target_reps: null,
      },
    ]);
    expect(rows[1].id).not.toBe(ROW_1);

    expect(deleteCall.delete).toHaveBeenCalled();
    expect(deleteCall.eq).toHaveBeenCalledWith("workout_id", WORKOUT_ID);
    expect(deleteCall.in).toHaveBeenCalledWith("id", [ROW_1]);
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
  });

  it("never deletes the workout and never touches sets or logs", async () => {
    queue(loaded, queryResult([{ id: EX_BENCH }]), queryResult(null), queryResult(null), queryResult(null));

    await updateWorkout({ id: WORKOUT_ID, name: "Push", items: [{ id: ROW_1, exerciseId: EX_BENCH }] });

    for (const workoutsCall of calls("workouts")) expect(workoutsCall.delete).not.toHaveBeenCalled();
    expect(calls("set_logs")).toHaveLength(0);
    expect(calls("workout_logs")).toHaveLength(0);
  });

  it("allows the same exercise more than once", async () => {
    queue(loaded, queryResult([{ id: EX_BENCH }]), queryResult(null), queryResult(null));

    const result = await updateWorkout({
      id: WORKOUT_ID,
      name: "Push",
      items: [
        { id: ROW_1, exerciseId: EX_BENCH },
        { id: ROW_2, exerciseId: EX_BENCH },
        { exerciseId: EX_BENCH },
      ],
    });

    expect(result).toEqual({ success: true });
    const [upsertCall] = calls("workout_exercises");
    expect(upsertCall.upsert.mock.calls[0][0].map((row: { sort_order: number }) => row.sort_order)).toEqual([0, 1, 2]);
    expect(calls("workout_exercises")).toHaveLength(1); // nothing dropped, so nothing deleted
  });

  it("does not delete anything when the upsert fails", async () => {
    queue(loaded, queryResult([{ id: EX_BENCH }]), queryResult(null), queryResult(null, { code: "XX000" }));

    const result = await updateWorkout({ id: WORKOUT_ID, name: "Push", items: [{ exerciseId: EX_BENCH }] });

    expect(result).toEqual({ success: false, error: "Couldn't update the workout's exercises. Try again." });
    expect(calls("workout_exercises")).toHaveLength(1);
  });
});
