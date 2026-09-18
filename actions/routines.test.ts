import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addRoutineItem,
  archiveRoutineItem,
  createRoutine,
  deleteRoutine,
  toggleRoutineItem,
} from "@/actions/routines";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";
import type { CreateRoutineInput } from "@/lib/validations/routines";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROUTINE_ID = "5b6f3d40-4444-4a11-8b11-444444444444";
const ITEM_ID = "5b6f3d40-5555-4a11-8b11-555555555555";

const validInput: CreateRoutineInput = {
  title: "Morning Routine",
  cadence: "daily",
  items: [{ title: "Drink water" }],
};

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createRoutine", () => {
  it("returns a validation error and never calls Supabase when there are no items", async () => {
    const result = await createRoutine({ title: "Morning Routine", cadence: "daily", items: [] });

    expect(result).toEqual({ success: false, error: "Add at least one item." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createRoutine(validInput);

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the routine, then its items, and redirects to /routines", async () => {
    const { revalidatePath } = await import("next/cache");
    const { redirect } = await import("next/navigation");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: ROUTINE_ID }, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await createRoutine(validInput);

    expect(supabase.from).toHaveBeenNthCalledWith(1, "routines");
    const routineBuilder = supabase.from.mock.results[0].value;
    expect(routineBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Morning Routine",
      cadence: "daily",
    });

    expect(supabase.from).toHaveBeenNthCalledWith(2, "routine_items");
    const itemsBuilder = supabase.from.mock.results[1].value;
    expect(itemsBuilder.insert).toHaveBeenCalledWith([
      { user_id: "user-1", routine_id: ROUTINE_ID, title: "Drink water", sort_order: 0 },
    ]);

    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(redirect).toHaveBeenCalledWith("/routines");
  });

  it("maps a Supabase error creating the routine to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createRoutine(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't create the routine. Try again." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("rolls back the routine when adding items fails", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: ROUTINE_ID }, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createRoutine(validInput);

    expect(result).toEqual({ success: false, error: "Couldn't add items to the routine. Try again." });
    expect(supabase.from).toHaveBeenNthCalledWith(3, "routines");
    const rollbackBuilder = supabase.from.mock.results[2].value;
    expect(rollbackBuilder.delete).toHaveBeenCalled();
    expect(rollbackBuilder.eq).toHaveBeenCalledWith("id", ROUTINE_ID);
  });
});

describe("deleteRoutine", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await deleteRoutine("not-a-uuid");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the routine by id and revalidates /routines", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await deleteRoutine(VALID_ID);

    expect(supabase.from).toHaveBeenCalledWith("routines");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteRoutine(VALID_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the routine. Try again." });
  });
});

describe("addRoutineItem", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await addRoutineItem({ routine_id: ROUTINE_ID, title: "" });

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await addRoutineItem({ routine_id: ROUTINE_ID, title: "Stretch" });

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("appends the item after the current count and revalidates both paths", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null, 2)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await addRoutineItem({ routine_id: ROUTINE_ID, title: "Stretch" });

    expect(supabase.from).toHaveBeenNthCalledWith(1, "routine_items");
    const countBuilder = supabase.from.mock.results[0].value;
    expect(countBuilder.eq).toHaveBeenCalledWith("routine_id", ROUTINE_ID);

    expect(supabase.from).toHaveBeenNthCalledWith(2, "routine_items");
    const insertBuilder = supabase.from.mock.results[1].value;
    expect(insertBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      routine_id: ROUTINE_ID,
      title: "Stretch",
      sort_order: 2,
    });

    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(result).toEqual({ success: true });
  });

  it("defaults sort_order to 0 when no count is returned", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await addRoutineItem({ routine_id: ROUTINE_ID, title: "Stretch" });

    const insertBuilder = supabase.from.mock.results[1].value;
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 0 })
    );
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null, 0)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await addRoutineItem({ routine_id: ROUTINE_ID, title: "Stretch" });

    expect(result).toEqual({ success: false, error: "Couldn't add the item. Try again." });
  });
});

describe("archiveRoutineItem", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await archiveRoutineItem("not-a-uuid", ROUTINE_ID);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks the item inactive and revalidates both paths", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await archiveRoutineItem(ITEM_ID, ROUTINE_ID);

    expect(supabase.from).toHaveBeenCalledWith("routine_items");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    expect(builder.eq).toHaveBeenCalledWith("id", ITEM_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await archiveRoutineItem(ITEM_ID, ROUTINE_ID);

    expect(result).toEqual({ success: false, error: "Couldn't remove the item. Try again." });
  });
});

describe("toggleRoutineItem", () => {
  const PERIOD_START = "2026-09-14";

  it("returns a validation error and never calls Supabase for an invalid id", async () => {
    const result = await toggleRoutineItem("not-a-uuid", PERIOD_START, true, ROUTINE_ID);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in when checking an item", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await toggleRoutineItem(ITEM_ID, PERIOD_START, true, ROUTINE_ID);

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("upserts a completion when checking the item", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await toggleRoutineItem(ITEM_ID, PERIOD_START, true, ROUTINE_ID);

    expect(supabase.from).toHaveBeenCalledWith("routine_completions");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "user-1", routine_item_id: ITEM_ID, period_start: PERIOD_START },
      { onConflict: "routine_item_id,period_start" }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message when checking fails", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await toggleRoutineItem(ITEM_ID, PERIOD_START, true, ROUTINE_ID);

    expect(result).toEqual({ success: false, error: "Couldn't update the item. Try again." });
  });

  it("deletes the completion when unchecking the item, without an auth check", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await toggleRoutineItem(ITEM_ID, PERIOD_START, false, ROUTINE_ID);

    expect(supabase.from).toHaveBeenCalledWith("routine_completions");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("routine_item_id", ITEM_ID);
    expect(builder.eq).toHaveBeenCalledWith("period_start", PERIOD_START);
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${ROUTINE_ID}`);
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message when unchecking fails", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await toggleRoutineItem(ITEM_ID, PERIOD_START, false, ROUTINE_ID);

    expect(result).toEqual({ success: false, error: "Couldn't update the item. Try again." });
  });
});
