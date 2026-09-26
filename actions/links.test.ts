import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkItem, setLinks, unlinkItem } from "@/actions/links";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const GOAL_ID = "550e8400-e29b-41d4-a716-446655440000";
const TASK_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const TASK_2 = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";
const TASK_3 = "6ba7b812-9dad-41d1-80b4-00c04fd430c8";

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

// The ownership check reads the goal and the items (in that order) through RLS.
function queueOwnership(goal: unknown, items: { id: string }[]) {
  supabase.from
    .mockReturnValueOnce(makeQueryBuilder(queryResult(goal)))
    .mockReturnValueOnce(makeQueryBuilder(queryResult(items)));
}

describe("linkItem", () => {
  it("rejects a goal as the target without calling Supabase", async () => {
    const result = await linkItem(GOAL_ID, { type: "goal", id: TASK_ID } as never);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("writes the goal as the source, and ignores a link that already exists", async () => {
    queueOwnership({ id: GOAL_ID }, [{ id: TASK_ID }]);
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    const result = await linkItem(GOAL_ID, { type: "task", id: TASK_ID });

    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["goals", "tasks", "links"]);
    expect(supabase.from.mock.results[2].value.upsert).toHaveBeenCalledWith(
      { user_id: "user-1", source_type: "goal", source_id: GOAL_ID, target_type: "task", target_id: TASK_ID },
      { onConflict: "source_type,source_id,target_type,target_id", ignoreDuplicates: true }
    );
    expect(result).toEqual({ success: true });
  });

  it("refuses an item the caller can't see (another user's, or deleted)", async () => {
    queueOwnership({ id: GOAL_ID }, []);

    const result = await linkItem(GOAL_ID, { type: "routine", id: TASK_ID });

    expect(result).toEqual({ success: false, error: "That no longer exists." });
    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["goals", "routines"]);
  });

  it("refuses a goal the caller can't see", async () => {
    queueOwnership(null, [{ id: TASK_ID }]);

    const result = await linkItem(GOAL_ID, { type: "task", id: TASK_ID });

    expect(result).toEqual({ success: false, error: "That no longer exists." });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});

describe("unlinkItem", () => {
  it("deletes only that goal's link to that item", async () => {
    queueOwnership({ id: GOAL_ID }, [{ id: TASK_ID }]);
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    const result = await unlinkItem(GOAL_ID, { type: "exercise", id: TASK_ID });

    const del = supabase.from.mock.results[2].value;
    expect(del.delete).toHaveBeenCalled();
    expect(del.eq.mock.calls).toEqual([
      ["source_type", "goal"],
      ["source_id", GOAL_ID],
      ["target_type", "exercise"],
      ["target_id", TASK_ID],
    ]);
    expect(result).toEqual({ success: true });
  });
});

describe("setLinks", () => {
  it("adds the newly ticked items and removes the unticked ones", async () => {
    // wanted: TASK_ID (kept), TASK_2 (new); existing: TASK_ID, TASK_3 (unticked)
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: GOAL_ID })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([{ id: TASK_ID }, { id: TASK_2 }])))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([{ target_id: TASK_ID }, { target_id: TASK_3 }])))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    const result = await setLinks(GOAL_ID, "task", [TASK_ID, TASK_2]);

    const add = supabase.from.mock.results[3].value;
    expect(add.upsert).toHaveBeenCalledWith(
      [{ user_id: "user-1", source_type: "goal", source_id: GOAL_ID, target_type: "task", target_id: TASK_2 }],
      { onConflict: "source_type,source_id,target_type,target_id", ignoreDuplicates: true }
    );
    const remove = supabase.from.mock.results[4].value;
    expect(remove.delete).toHaveBeenCalled();
    expect(remove.in).toHaveBeenCalledWith("target_id", [TASK_3]);
    expect(result).toEqual({ success: true });
  });

  it("writes nothing when the selection hasn't changed", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: GOAL_ID })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([{ id: TASK_ID }])))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([{ target_id: TASK_ID }])));

    const result = await setLinks(GOAL_ID, "task", [TASK_ID]);

    expect(supabase.from).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ success: true });
  });

  it("refuses the whole save when any ticked item isn't the caller's", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult({ id: GOAL_ID })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([{ id: TASK_ID }])))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([])));

    const result = await setLinks(GOAL_ID, "workout", [TASK_ID, TASK_2]);

    expect(result).toEqual({ success: false, error: "That no longer exists." });
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });

  it("rejects an unknown type", async () => {
    const result = await setLinks(GOAL_ID, "goal" as never, []);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
