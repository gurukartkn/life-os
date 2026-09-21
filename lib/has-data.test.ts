import { beforeEach, describe, expect, it, vi } from "vitest";
import { userHasData } from "./has-data";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

let supabase: SupabaseMock;

// Every table answers with `rows` unless overridden by name.
function answer(rows: unknown[], overrides: Record<string, ReturnType<typeof queryResult>> = {}) {
  supabase.from.mockImplementation((table: string) =>
    makeQueryBuilder(overrides[table] ?? queryResult(rows, null))
  );
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("userHasData", () => {
  it("is false for a brand-new account with no rows anywhere", async () => {
    answer([]);

    expect(await userHasData(supabase as never)).toBe(false);
  });

  it.each(["tasks", "goals", "routines", "exercises", "workouts", "workout_logs"])(
    "is true when only %s has a row",
    async (table) => {
      answer([], { [table]: queryResult([{ id: "1" }], null) });

      expect(await userHasData(supabase as never)).toBe(true);
    }
  );

  it("never counts user_settings, which every account has", async () => {
    answer([]);

    await userHasData(supabase as never);

    expect(supabase.from.mock.calls.map((call) => call[0])).not.toContain("user_settings");
  });

  it("probes every content table, each with limit(1)", async () => {
    const builders: Record<string, ReturnType<typeof makeQueryBuilder>> = {};
    supabase.from.mockImplementation((table: string) => {
      builders[table] = makeQueryBuilder(queryResult([], null));
      return builders[table];
    });

    await userHasData(supabase as never);

    expect(Object.keys(builders).sort()).toEqual(
      ["exercises", "goals", "routines", "tasks", "workout_logs", "workouts"].sort()
    );
    for (const builder of Object.values(builders)) expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it("fails open (shows export) when a probe errors", async () => {
    answer([], { routines: queryResult(null, { message: "db exploded" }) });

    expect(await userHasData(supabase as never)).toBe(true);
  });
});
