import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoal, deleteGoal, updateGoal } from "@/actions/goals";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/dates";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const GOAL_ID = "550e8400-e29b-41d4-a716-446655440000";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const timezone = () => makeQueryBuilder(queryResult({ timezone: "UTC" }));

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createGoal", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await createGoal({ success: false }, formData({ title: "  ", status: "active" }));

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an unknown status", async () => {
    const result = await createGoal({ success: false }, formData({ title: "Run", status: "completed" }));

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createGoal({ success: false }, formData({ title: "Run a 10K" }));

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts an active goal with its target date and revalidates Goals and Today", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(timezone()).mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    const result = await createGoal(
      { success: false },
      formData({ title: " Run a 10K ", targetDate: "2026-11-08", status: "active" })
    );

    const insert = supabase.from.mock.results[1].value.insert;
    expect(supabase.from).toHaveBeenNthCalledWith(2, "goals");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Run a 10K",
      target_date: "2026-11-08",
      status: "active",
      achieved_on: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/goals", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(result).toEqual({ success: true });
  });

  it("stamps today's date on a goal created as achieved, and null for no target", async () => {
    supabase.from.mockReturnValueOnce(timezone()).mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    await createGoal({ success: false }, formData({ title: "Done already", status: "achieved" }));

    expect(supabase.from.mock.results[1].value.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "achieved", achieved_on: todayIso("UTC"), target_date: null })
    );
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from
      .mockReturnValueOnce(timezone())
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createGoal({ success: false }, formData({ title: "Run a 10K" }));

    expect(result).toEqual({ success: false, error: "Couldn't add the goal. Try again." });
  });
});

describe("updateGoal", () => {
  function queueUpdate(current: { status: string; achieved_on: string | null } | null, updateError: unknown = null) {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(current)))
      .mockReturnValueOnce(timezone())
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, updateError)));
  }

  const fields = (status: string) => formData({ id: GOAL_ID, title: "Run a 10K", status });

  it("stamps today when an active goal becomes achieved, and sets updated_at", async () => {
    queueUpdate({ status: "active", achieved_on: null });

    const result = await updateGoal({ success: false }, fields("achieved"));

    const update = supabase.from.mock.results[2].value.update;
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "achieved", achieved_on: todayIso("UTC"), updated_at: expect.any(String) })
    );
    expect(supabase.from.mock.results[2].value.eq).toHaveBeenCalledWith("id", GOAL_ID);
    expect(result).toEqual({ success: true });
  });

  it("keeps the reached date while a goal stays achieved", async () => {
    queueUpdate({ status: "achieved", achieved_on: "2026-09-15" });

    await updateGoal({ success: false }, fields("achieved"));

    expect(supabase.from.mock.results[2].value.update).toHaveBeenCalledWith(
      expect.objectContaining({ achieved_on: "2026-09-15" })
    );
  });

  it("clears the reached date when a goal leaves achieved, reading a v1 status as its v2 name", async () => {
    queueUpdate({ status: "completed", achieved_on: "2026-09-15" });

    await updateGoal({ success: false }, fields("dropped"));

    expect(supabase.from.mock.results[2].value.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dropped", achieved_on: null })
    );
  });

  it("says so when the goal is gone", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null))).mockReturnValueOnce(timezone());

    const result = await updateGoal({ success: false }, fields("active"));

    expect(result).toEqual({ success: false, error: "That goal no longer exists." });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("maps a Supabase error to a friendly message", async () => {
    queueUpdate({ status: "active", achieved_on: null }, { message: "db exploded" });

    const result = await updateGoal({ success: false }, fields("active"));

    expect(result).toEqual({ success: false, error: "Couldn't save the goal. Try again." });
  });
});

describe("deleteGoal", () => {
  it("rejects a malformed id without calling Supabase", async () => {
    const result = await deleteGoal("nope");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the goal's links first, then the goal", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    const result = await deleteGoal(GOAL_ID);

    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["links", "goals"]);
    const links = supabase.from.mock.results[0].value;
    expect(links.eq).toHaveBeenCalledWith("source_type", "goal");
    expect(links.eq).toHaveBeenCalledWith("source_id", GOAL_ID);
    expect(supabase.from.mock.results[1].value.eq).toHaveBeenCalledWith("id", GOAL_ID);
    expect(result).toEqual({ success: true });
  });

  it("keeps the goal when its links can't be deleted", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteGoal(GOAL_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the goal. Try again." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
