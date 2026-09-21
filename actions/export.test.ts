import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportUserData } from "@/actions/export";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

// Order matches the Promise.all call order in actions/export.ts.
const TABLE_ORDER = [
  "user_settings",
  "tasks",
  "goals",
  "routines",
  "routine_items",
  "routine_completions",
  "links",
  "exercises",
  "workouts",
  "workout_exercises",
  "workout_logs",
  "set_logs",
] as const;

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

function queueAllSuccess() {
  for (const table of TABLE_ORDER) {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult([{ table }], null)));
  }
}

describe("exportUserData", () => {
  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await exportUserData();

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails the whole export when any one of the parallel queries errors", async () => {
    // Queue success for every table except "routines", which errors.
    for (const table of TABLE_ORDER) {
      if (table === "routines") {
        supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));
      } else {
        supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult([{ table }], null)));
      }
    }

    const result = await exportUserData();

    expect(result).toEqual({ success: false, error: "Couldn't export your data. Try again." });
  });

  it("returns every table's data shaped for export on success", async () => {
    queueAllSuccess();

    const result = await exportUserData();

    expect(TABLE_ORDER.map((t) => supabase.from.mock.calls.find((c) => c[0] === t)?.[0])).toEqual([
      ...TABLE_ORDER,
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      user_settings: [{ table: "user_settings" }],
      tasks: [{ table: "tasks" }],
      goals: [{ table: "goals" }],
      routines: [{ table: "routines" }],
      routine_items: [{ table: "routine_items" }],
      routine_completions: [{ table: "routine_completions" }],
      links: [{ table: "links" }],
      exercises: [{ table: "exercises" }],
      workouts: [{ table: "workouts" }],
      workout_exercises: [{ table: "workout_exercises" }],
      workout_logs: [{ table: "workout_logs" }],
      set_logs: [{ table: "set_logs" }],
    });
    expect(typeof result.data?.exported_at).toBe("string");
  });

  // v2 Stage 2 renamed the todos table; the export key follows it, with no leftover `todos`.
  it("exports the tasks key and no todos key", async () => {
    queueAllSuccess();

    const result = await exportUserData();

    expect(Object.keys(result.data ?? {})).toContain("tasks");
    expect(result.data).not.toHaveProperty("todos");
    expect(supabase.from).not.toHaveBeenCalledWith("todos");
  });

  it("defaults each table to an empty array when data is null", async () => {
    for (const _table of TABLE_ORDER) {
      supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));
    }

    const result = await exportUserData();

    expect(result.success).toBe(true);
    expect(result.data?.tasks).toEqual([]);
    expect(result.data?.set_logs).toEqual([]);
  });
});
