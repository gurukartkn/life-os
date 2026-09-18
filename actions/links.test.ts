import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkRoutineToGoal, linkWorkoutLogToGoal, unlinkGoal, unlinkRoutineGoal } from "@/actions/links";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";
const WORKOUT_LOG_ID = "5b6f3d40-3333-4a11-8b11-333333333333";
const ROUTINE_ID = "5b6f3d40-4444-4a11-8b11-444444444444";
const GOAL_ID = "5b6f3d40-6666-4a11-8b11-666666666666";

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("linkWorkoutLogToGoal", () => {
  it("returns a validation error and never calls Supabase for an invalid goal_id", async () => {
    const result = await linkWorkoutLogToGoal({ workout_log_id: WORKOUT_LOG_ID, goal_id: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await linkWorkoutLogToGoal({ workout_log_id: WORKOUT_LOG_ID, goal_id: GOAL_ID });

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("upserts a link and revalidates the workout log page", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await linkWorkoutLogToGoal({ workout_log_id: WORKOUT_LOG_ID, goal_id: GOAL_ID });

    expect(supabase.from).toHaveBeenCalledWith("links");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        source_type: "workout_log",
        source_id: WORKOUT_LOG_ID,
        target_type: "goal",
        target_id: GOAL_ID,
      },
      { onConflict: "source_type,source_id,target_type,target_id" }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/fitness/log/${WORKOUT_LOG_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await linkWorkoutLogToGoal({ workout_log_id: WORKOUT_LOG_ID, goal_id: GOAL_ID });

    expect(result).toEqual({ success: false, error: "Couldn't link to the goal. Try again." });
  });
});

describe("unlinkGoal", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await unlinkGoal("not-a-uuid", WORKOUT_LOG_ID);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the link and revalidates the workout log page", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await unlinkGoal(VALID_ID, WORKOUT_LOG_ID);

    expect(supabase.from).toHaveBeenCalledWith("links");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/fitness/log/${WORKOUT_LOG_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await unlinkGoal(VALID_ID, WORKOUT_LOG_ID);

    expect(result).toEqual({ success: false, error: "Couldn't remove the link. Try again." });
  });
});

describe("linkRoutineToGoal", () => {
  it("returns a validation error and never calls Supabase for an invalid goal_id", async () => {
    const result = await linkRoutineToGoal({ routine_id: ROUTINE_ID, goal_id: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await linkRoutineToGoal({ routine_id: ROUTINE_ID, goal_id: GOAL_ID });

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("upserts a link and revalidates the routine page", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await linkRoutineToGoal({ routine_id: ROUTINE_ID, goal_id: GOAL_ID });

    expect(supabase.from).toHaveBeenCalledWith("links");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        source_type: "routine",
        source_id: ROUTINE_ID,
        target_type: "goal",
        target_id: GOAL_ID,
      },
      { onConflict: "source_type,source_id,target_type,target_id" }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await linkRoutineToGoal({ routine_id: ROUTINE_ID, goal_id: GOAL_ID });

    expect(result).toEqual({ success: false, error: "Couldn't link to the goal. Try again." });
  });
});

describe("unlinkRoutineGoal", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await unlinkRoutineGoal("not-a-uuid", ROUTINE_ID);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the link and revalidates the routine page", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await unlinkRoutineGoal(VALID_ID, ROUTINE_ID);

    expect(supabase.from).toHaveBeenCalledWith("links");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await unlinkRoutineGoal(VALID_ID, ROUTINE_ID);

    expect(result).toEqual({ success: false, error: "Couldn't remove the link. Try again." });
  });
});
