import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSetLog, saveSetLog, startWorkoutLog } from "@/actions/workout-logs";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";
import type { SetLogSaveInput } from "@/lib/validations/fitness";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";
const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const WORKOUT_LOG_ID = "5b6f3d40-3333-4a11-8b11-333333333333";
const EXERCISE_ID = "5b6f3d40-2222-4a11-8b11-222222222222";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("startWorkoutLog", () => {
  // Note: `redirect()` is mocked as a plain no-op here (it normally throws in
  // real Next.js to unwind the stack). The action has no `return` after its
  // early redirect calls, so on every failure branch it keeps executing past
  // the redirect and hits a property access on data that was never fetched
  // (e.g. a null user or null insert result), which throws. We still assert
  // that `redirect` was called with the right path before that happens.

  it("redirects to /fitness when the workout_id is invalid", async () => {
    const fd = formData({ workout_id: "not-a-uuid" });

    await expect(startWorkoutLog(fd)).rejects.toThrow();

    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith("/fitness");
  });

  it("redirects to /login when the user is not authenticated", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const fd = formData({ workout_id: WORKOUT_ID });

    await expect(startWorkoutLog(fd)).rejects.toThrow();

    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /fitness when the insert fails", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));
    const fd = formData({ workout_id: WORKOUT_ID });

    await expect(startWorkoutLog(fd)).rejects.toThrow();

    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith("/fitness");
  });

  it("inserts a workout log and redirects to the new log's page", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult({ id: WORKOUT_LOG_ID }, null)));
    const fd = formData({ workout_id: WORKOUT_ID });

    await startWorkoutLog(fd);

    expect(supabase.from).toHaveBeenCalledWith("workout_logs");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", workout_id: WORKOUT_ID })
    );
    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith(`/fitness/log/${WORKOUT_LOG_ID}`);
  });
});

describe("saveSetLog", () => {
  const validInput: SetLogSaveInput = {
    workout_log_id: WORKOUT_LOG_ID,
    exercise_id: EXERCISE_ID,
    set_number: 1,
    weight: 135,
    reps: 8,
  };

  it("returns a validation error and never calls Supabase when neither reps nor duration is given", async () => {
    const result = await saveSetLog({
      workout_log_id: WORKOUT_LOG_ID,
      exercise_id: EXERCISE_ID,
      set_number: 1,
    });

    expect(result).toEqual({ success: false, error: "Enter reps or a duration." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await saveSetLog(validInput);

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps a Supabase error from the lookup to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await saveSetLog(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't save the set. Try again." });
  });

  it("inserts a new set log when none exists yet", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await saveSetLog(validInput);

    const lookupBuilder = supabase.from.mock.results[0].value;
    expect(lookupBuilder.eq).toHaveBeenCalledWith("workout_log_id", WORKOUT_LOG_ID);
    expect(lookupBuilder.eq).toHaveBeenCalledWith("exercise_id", EXERCISE_ID);
    expect(lookupBuilder.eq).toHaveBeenCalledWith("set_number", 1);

    const insertBuilder = supabase.from.mock.results[1].value;
    expect(insertBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      workout_log_id: WORKOUT_LOG_ID,
      exercise_id: EXERCISE_ID,
      set_number: 1,
      weight: 135,
      reps: 8,
      duration_seconds: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/fitness/log/${WORKOUT_LOG_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("updates the existing set log when one is found", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: "existing-set-1" }, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await saveSetLog(validInput);

    const updateBuilder = supabase.from.mock.results[1].value;
    expect(updateBuilder.update).toHaveBeenCalledWith({
      weight: 135,
      reps: 8,
      duration_seconds: null,
    });
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "existing-set-1");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error saving the set to a friendly message", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await saveSetLog(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't save the set. Try again." });
  });
});

describe("deleteSetLog", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await deleteSetLog("not-a-uuid", WORKOUT_LOG_ID);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the set log and revalidates the workout log page", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await deleteSetLog(VALID_ID, WORKOUT_LOG_ID);

    expect(supabase.from).toHaveBeenCalledWith("set_logs");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/fitness/log/${WORKOUT_LOG_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteSetLog(VALID_ID, WORKOUT_LOG_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the set. Try again." });
  });
});
