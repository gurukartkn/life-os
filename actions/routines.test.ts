import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoutine, setRoutineActive, toggleRoutineItem, updateRoutine } from "@/actions/routines";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";
import type { RoutineFormInput } from "@/lib/validations/routines";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const ROUTINE_ID = "5b6f3d40-4444-4a11-8b11-444444444444";
const ITEM_ID = "5b6f3d40-5555-4a11-8b11-555555555555";
const OLD_ITEM = "5b6f3d40-6666-4a11-8b11-666666666666";

function input(overrides: Partial<RoutineFormInput> = {}): RoutineFormInput {
  return {
    title: "Skincare",
    timeOfDay: "evening",
    frequency: "daily",
    timesPerWeek: null,
    weekdays: null,
    items: [
      { title: "Cleanser", repeatRule: "every_time", repeatEvery: null, isActive: true },
      { title: "Exfoliate", repeatRule: "every_nth", repeatEvery: 2, isActive: true },
    ],
    ...overrides,
  };
}

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

const builder = (index: number) => supabase.from.mock.results[index].value;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createRoutine", () => {
  it("refuses a routine with no items, without calling Supabase", async () => {
    const result = await createRoutine(input({ items: [] }));

    expect(result).toEqual({ success: false, error: "Add at least one item." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires days for a specific-days routine", async () => {
    const result = await createRoutine(input({ frequency: "specific_days", weekdays: [] }));
    expect(result).toEqual({ success: false, error: "Pick at least one day." });
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await createRoutine(input())).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the routine with its schedule, then its items in order, and redirects to /routines", async () => {
    const { redirect } = await import("next/navigation");
    const { revalidatePath } = await import("next/cache");
    queue(queryResult({ id: ROUTINE_ID }), queryResult(null));

    await createRoutine(input());

    expect(builder(0).insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Skincare",
      time_of_day: "evening",
      frequency: "daily",
      times_per_week: null,
      weekdays: null,
    });
    expect(builder(1).insert).toHaveBeenCalledWith([
      expect.objectContaining({ title: "Cleanser", repeat_rule: "every_time", repeat_every: null, sort_order: 0 }),
      expect.objectContaining({ title: "Exfoliate", repeat_rule: "every_nth", repeat_every: 2, sort_order: 1 }),
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/routines", "layout");
    expect(redirect).toHaveBeenCalledWith("/routines");
  });

  it("treats all seven days as Daily", async () => {
    queue(queryResult({ id: ROUTINE_ID }), queryResult(null));

    await createRoutine(input({ frequency: "specific_days", weekdays: [1, 2, 3, 4, 5, 6, 7] }));

    expect(builder(0).insert).toHaveBeenCalledWith(expect.objectContaining({ frequency: "daily", weekdays: null }));
  });

  it("keeps N times a week, and sorts specific days", async () => {
    queue(queryResult({ id: ROUTINE_ID }), queryResult(null));
    await createRoutine(input({ frequency: "times_per_week", timesPerWeek: 3 }));
    expect(builder(0).insert).toHaveBeenCalledWith(expect.objectContaining({ frequency: "times_per_week", times_per_week: 3 }));

    queue(queryResult({ id: ROUTINE_ID }), queryResult(null));
    await createRoutine(input({ frequency: "specific_days", weekdays: [7, 3] }));
    expect(builder(2).insert).toHaveBeenCalledWith(expect.objectContaining({ weekdays: [3, 7], times_per_week: null }));
  });

  it("removes the routine again when its items can't be saved", async () => {
    queue(queryResult({ id: ROUTINE_ID }), queryResult(null, { message: "boom" }), queryResult(null));

    const result = await createRoutine(input());

    expect(result).toEqual({ success: false, error: "Couldn't add items to the routine. Try again." });
    expect(builder(2).delete).toHaveBeenCalled();
  });
});

describe("updateRoutine", () => {
  it("updates the routine, keeps and inserts items in order, and removes the ones left out", async () => {
    queue(
      queryResult({ id: ROUTINE_ID }), // routine update
      queryResult([{ id: ITEM_ID }, { id: OLD_ITEM }]), // existing items
      queryResult(null), // update kept item
      queryResult(null), // insert new item
      queryResult(null) // delete removed item
    );

    const result = await updateRoutine(
      ROUTINE_ID,
      input({
        items: [
          { title: "New item", repeatRule: "weekly", repeatEvery: null, isActive: true },
          { id: ITEM_ID, title: "Cleanser", repeatRule: "every_time", repeatEvery: null, isActive: false },
        ],
      })
    );

    expect(result).toEqual({ success: true });
    expect(builder(0).update).toHaveBeenCalledWith(expect.objectContaining({ title: "Skincare", time_of_day: "evening" }));
    expect(builder(2).insert).toHaveBeenCalledWith(
      expect.objectContaining({ routine_id: ROUTINE_ID, title: "New item", repeat_rule: "weekly", sort_order: 0 })
    );
    expect(builder(3).update).toHaveBeenCalledWith(expect.objectContaining({ title: "Cleanser", is_active: false, sort_order: 1 }));
    expect(builder(3).eq).toHaveBeenCalledWith("id", ITEM_ID);
    expect(builder(4).delete).toHaveBeenCalled();
    expect(builder(4).in).toHaveBeenCalledWith("id", [OLD_ITEM]);
  });

  it("refuses an item id that isn't part of the routine", async () => {
    queue(queryResult({ id: ROUTINE_ID }), queryResult([{ id: OLD_ITEM }]));

    const result = await updateRoutine(
      ROUTINE_ID,
      input({ items: [{ id: ITEM_ID, title: "Cleanser", repeatRule: "every_time", repeatEvery: null, isActive: true }] })
    );

    expect(result).toEqual({ success: false, error: "An item doesn't belong to this routine." });
  });

  it("says so when the routine no longer exists", async () => {
    queue(queryResult(null));
    expect(await updateRoutine(ROUTINE_ID, input())).toEqual({ success: false, error: "That routine no longer exists." });
  });

  it("needs at least one active item", async () => {
    const result = await updateRoutine(
      ROUTINE_ID,
      input({ items: [{ id: ITEM_ID, title: "Cleanser", repeatRule: "every_time", repeatEvery: null, isActive: false }] })
    );
    expect(result).toEqual({ success: false, error: "Add at least one item." });
  });
});

describe("setRoutineActive", () => {
  it("archives and restores a routine", async () => {
    queue(queryResult(null), queryResult(null));

    expect(await setRoutineActive(ROUTINE_ID, false)).toEqual({ success: true });
    expect(builder(0).update).toHaveBeenCalledWith({ is_active: false });
    expect(await setRoutineActive(ROUTINE_ID, true)).toEqual({ success: true });
    expect(builder(1).update).toHaveBeenCalledWith({ is_active: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    queue(queryResult(null, { message: "down" }));
    expect(await setRoutineActive(ROUTINE_ID, false)).toEqual({
      success: false,
      error: "Couldn't archive the routine. Try again.",
    });
  });
});

describe("toggleRoutineItem", () => {
  it("rejects a bad date without calling Supabase", async () => {
    const result = await toggleRoutineItem(ITEM_ID, "23/09/2026", true);
    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("records a completion for the day when checking", async () => {
    queue(queryResult(null));

    expect(await toggleRoutineItem(ITEM_ID, "2026-09-23", true)).toEqual({ success: true });
    expect(builder(0).upsert).toHaveBeenCalledWith(
      { user_id: "user-1", routine_item_id: ITEM_ID, period_start: "2026-09-23" },
      { onConflict: "routine_item_id,period_start" }
    );
  });

  it("removes the day's completion when unchecking", async () => {
    queue(queryResult(null));

    expect(await toggleRoutineItem(ITEM_ID, "2026-09-23", false)).toEqual({ success: true });
    expect(builder(0).delete).toHaveBeenCalled();
    expect(builder(0).eq).toHaveBeenCalledWith("period_start", "2026-09-23");
  });

  it("maps a Supabase error to a friendly message", async () => {
    queue(queryResult(null, { message: "down" }));
    expect(await toggleRoutineItem(ITEM_ID, "2026-09-23", true)).toEqual({
      success: false,
      error: "Couldn't update the item. Try again.",
    });
  });
});
