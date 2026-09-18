import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveExercise, createExercise } from "@/actions/exercises";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

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

describe("createExercise", () => {
  it("returns a validation error and never calls Supabase when the name is empty", async () => {
    const result = await createExercise(
      { success: false },
      formData({ name: "", exercise_type: "weight_training" })
    );

    expect(result).toEqual({ success: false, error: "Enter a name." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createExercise(
      { success: false },
      formData({ name: "Bench Press", exercise_type: "weight_training" })
    );

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the exercise for the current user, splitting csv fields into arrays", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createExercise(
      { success: false },
      formData({
        name: "Bench Press",
        exercise_type: "weight_training",
        muscle_groups: "chest, triceps",
        equipment: "barbell, bench",
      })
    );

    expect(supabase.from).toHaveBeenCalledWith("exercises");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Bench Press",
      exercise_type: "weight_training",
      muscle_groups: ["chest", "triceps"],
      equipment: ["barbell", "bench"],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createExercise(
      { success: false },
      formData({ name: "Bench Press", exercise_type: "weight_training" })
    );

    expect(result).toEqual({ success: false, error: "Couldn't add the exercise. Try again." });
  });
});

describe("archiveExercise", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await archiveExercise("not-a-uuid");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks the exercise inactive and revalidates /fitness", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await archiveExercise(VALID_ID);

    expect(supabase.from).toHaveBeenCalledWith("exercises");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await archiveExercise(VALID_ID);

    expect(result).toEqual({ success: false, error: "Couldn't archive the exercise. Try again." });
  });
});
