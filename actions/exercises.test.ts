import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveExercise, createExerciseWithTags, updateExercise } from "@/actions/exercises";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

const MG_A = "aaaaaaaa-1111-4a11-8b11-111111111111";
const MG_B = "bbbbbbbb-1111-4a11-8b11-111111111111";
const MG_C = "cccccccc-1111-4a11-8b11-111111111111";
const EQ_1 = "eeeeeeee-1111-4a11-8b11-111111111111";

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

function calls(table: string) {
  return supabase.from.mock.calls.flatMap(([name], index) =>
    name === table ? [supabase.from.mock.results[index].value] : []
  );
}

describe("updateExercise", () => {
  const input = {
    id: VALID_ID,
    name: "Bench Press",
    exerciseType: "weight_training" as const,
    muscleGroupIds: [MG_B, MG_C],
    equipmentIds: [],
  };

  it("replaces the tag sets: inserts the missing links and deletes the ones no longer listed", async () => {
    const { revalidatePath } = await import("next/cache");
    queue(
      queryResult({ id: VALID_ID }), // exercise exists (RLS-scoped)
      queryResult([{ id: MG_B }, { id: MG_C }]), // both muscle groups are the caller's
      queryResult(null), // update the exercise row
      queryResult([{ muscle_group_id: MG_A }, { muscle_group_id: MG_B }]), // current muscle group links
      queryResult(null), // insert MG_C
      queryResult(null), // delete MG_A
      queryResult([{ equipment_id: EQ_1 }]), // current equipment links
      queryResult(null) // delete EQ_1
    );

    const result = await updateExercise(input);

    expect(result).toEqual({ success: true });

    const [exerciseUpdate] = calls("exercises").slice(1);
    expect(exerciseUpdate.update).toHaveBeenCalledWith({
      name: "Bench Press",
      exercise_type: "weight_training",
      updated_at: expect.any(String),
    });

    const mgLinks = calls("exercise_muscle_groups");
    expect(mgLinks[1].insert).toHaveBeenCalledWith([
      { exercise_id: VALID_ID, user_id: "user-1", muscle_group_id: MG_C },
    ]);
    expect(mgLinks[2].delete).toHaveBeenCalled();
    expect(mgLinks[2].eq).toHaveBeenCalledWith("exercise_id", VALID_ID);
    expect(mgLinks[2].in).toHaveBeenCalledWith("muscle_group_id", [MG_A]);

    const eqLinks = calls("exercise_equipment");
    expect(eqLinks[0].insert).not.toHaveBeenCalled();
    expect(eqLinks[1].in).toHaveBeenCalledWith("equipment_id", [EQ_1]);
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
  });

  it("changes nothing on the links when the sets are already equal", async () => {
    queue(
      queryResult({ id: VALID_ID }),
      queryResult([{ id: MG_B }]),
      queryResult(null),
      queryResult([{ muscle_group_id: MG_B }]),
      queryResult([])
    );

    const result = await updateExercise({ ...input, muscleGroupIds: [MG_B, MG_B] });

    expect(result).toEqual({ success: true });
    expect(calls("exercise_muscle_groups")).toHaveLength(1);
    expect(calls("exercise_equipment")).toHaveLength(1);
  });

  it("rejects another user's muscle group id and writes nothing", async () => {
    queue(
      queryResult({ id: VALID_ID }),
      queryResult([{ id: MG_B }]) // RLS hides MG_C: only one of the two ids comes back
    );

    const result = await updateExercise(input);

    expect(result).toEqual({
      success: false,
      error: "One of the selected muscle groups or equipment isn't available.",
    });
    expect(calls("exercises")).toHaveLength(1); // only the existence check, never the update
    expect(calls("exercise_muscle_groups")).toHaveLength(0);
  });

  it("rejects another user's equipment id", async () => {
    queue(queryResult({ id: VALID_ID }), queryResult([{ id: MG_B }, { id: MG_C }]), queryResult([]));

    const result = await updateExercise({ ...input, equipmentIds: [EQ_1] });

    expect(result.success).toBe(false);
    expect(calls("exercises")).toHaveLength(1);
  });

  it("reports an exercise that does not exist", async () => {
    queue(queryResult(null));

    const result = await updateExercise(input);

    expect(result).toEqual({ success: false, error: "That exercise no longer exists." });
  });

  it("validates the input before touching Supabase", async () => {
    const result = await updateExercise({ ...input, name: "  ", muscleGroupIds: ["nope"] });

    expect(result).toEqual({ success: false, error: "Enter a name." });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("createExerciseWithTags", () => {
  const input = {
    name: " Bench Press ",
    exerciseType: "weight_training" as const,
    muscleGroupIds: [MG_A],
    equipmentIds: [EQ_1],
  };

  it("checks ownership, inserts the exercise, then its links", async () => {
    queue(
      queryResult([{ id: MG_A }]),
      queryResult([{ id: EQ_1 }]),
      queryResult({ id: VALID_ID }),
      queryResult([]), // no current muscle group links
      queryResult(null), // insert
      queryResult([]),
      queryResult(null)
    );

    const result = await createExerciseWithTags(input);

    expect(result).toEqual({ success: true, data: { id: VALID_ID } });
    expect(calls("exercises")[0].insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Bench Press",
      exercise_type: "weight_training",
    });
    expect(calls("exercise_muscle_groups")[1].insert).toHaveBeenCalledWith([
      { exercise_id: VALID_ID, user_id: "user-1", muscle_group_id: MG_A },
    ]);
    expect(calls("exercise_equipment")[1].insert).toHaveBeenCalledWith([
      { exercise_id: VALID_ID, user_id: "user-1", equipment_id: EQ_1 },
    ]);
  });

  it("rejects another user's id before inserting anything", async () => {
    queue(queryResult([]), queryResult([{ id: EQ_1 }]));

    const result = await createExerciseWithTags(input);

    expect(result.success).toBe(false);
    expect(calls("exercises")).toHaveLength(0);
  });

  it("removes the exercise again when its links cannot be saved", async () => {
    queue(
      queryResult([{ id: MG_A }]),
      queryResult([{ id: EQ_1 }]),
      queryResult({ id: VALID_ID }),
      queryResult(null, { code: "XX000", message: "db exploded" }), // reading current links fails
      queryResult(null) // cleanup delete
    );

    const result = await createExerciseWithTags(input);

    expect(result).toEqual({ success: false, error: "Couldn't add the exercise. Try again." });
    expect(calls("exercises")[1].delete).toHaveBeenCalled();
    expect(calls("exercises")[1].eq).toHaveBeenCalledWith("id", VALID_ID);
  });

  it("accepts empty tag lists", async () => {
    queue(queryResult({ id: VALID_ID }), queryResult([]), queryResult([]));

    const result = await createExerciseWithTags({ ...input, muscleGroupIds: [], equipmentIds: [] });

    expect(result).toEqual({ success: true, data: { id: VALID_ID } });
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
