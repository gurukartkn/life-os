import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkout, deleteWorkout } from "@/actions/workouts";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";
import type { CreateWorkoutInput } from "@/lib/validations/fitness";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";
const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const EXERCISE_ID = "5b6f3d40-2222-4a11-8b11-222222222222";

const validInput: CreateWorkoutInput = {
  name: "Push Day",
  exercises: [{ exercise_id: EXERCISE_ID, target_sets: 3, target_reps: "8-10" }],
};

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createWorkout", () => {
  it("returns a validation error and never calls Supabase when there are no exercises", async () => {
    const result = await createWorkout({ name: "Push Day", exercises: [] });

    expect(result).toEqual({ success: false, error: "Add at least one exercise." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createWorkout(validInput);

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the workout, then its exercises, and redirects to /fitness", async () => {
    const { revalidatePath } = await import("next/cache");
    const { redirect } = await import("next/navigation");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: WORKOUT_ID }, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await createWorkout(validInput);

    expect(supabase.from).toHaveBeenNthCalledWith(1, "workouts");
    const workoutBuilder = supabase.from.mock.results[0].value;
    expect(workoutBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Push Day",
      notes: null,
    });

    expect(supabase.from).toHaveBeenNthCalledWith(2, "workout_exercises");
    const exercisesBuilder = supabase.from.mock.results[1].value;
    expect(exercisesBuilder.insert).toHaveBeenCalledWith([
      {
        user_id: "user-1",
        workout_id: WORKOUT_ID,
        exercise_id: EXERCISE_ID,
        sort_order: 0,
        target_sets: 3,
        target_reps: "8-10",
      },
    ]);

    expect(revalidatePath).toHaveBeenCalledWith("/fitness", "layout");
    expect(redirect).toHaveBeenCalledWith("/fitness/workouts");
  });

  it("maps a Supabase error creating the workout to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createWorkout(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't create the workout. Try again." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("rolls back the workout when adding exercises fails", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: WORKOUT_ID }, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createWorkout(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't add exercises to the workout. Try again." });
    expect(supabase.from).toHaveBeenNthCalledWith(3, "workouts");
    const rollbackBuilder = supabase.from.mock.results[2].value;
    expect(rollbackBuilder.delete).toHaveBeenCalled();
    expect(rollbackBuilder.eq).toHaveBeenCalledWith("id", WORKOUT_ID);
  });
});

describe("deleteWorkout", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await deleteWorkout("not-a-uuid");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the workout by id, then the links to it, and revalidates /fitness and /goals", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await deleteWorkout(VALID_ID);

    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["workouts", "links"]);
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(supabase.from.mock.results[1].value.eq.mock.calls).toEqual([
      ["target_type", "workout"],
      ["target_id", VALID_ID],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/fitness", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/goals", "layout");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteWorkout(VALID_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the workout. Try again." });
  });
});
