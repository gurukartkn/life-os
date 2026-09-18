import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoal } from "@/actions/goals";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

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

describe("createGoal", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await createGoal({ success: false }, formData({ title: "" }));

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createGoal({ success: false }, formData({ title: "Run a marathon" }));

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the goal for the current user and revalidates /goals", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createGoal(
      { success: false },
      formData({ title: "Run a marathon", target_date: "2026-12-01" })
    );

    expect(supabase.from).toHaveBeenCalledWith("goals");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Run a marathon",
      target_date: "2026-12-01",
      status: "active",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/goals");
    expect(result).toEqual({ success: true });
  });

  it("inserts with a null target_date when none is given", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await createGoal({ success: false }, formData({ title: "Run a marathon" }));

    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ target_date: null })
    );
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createGoal({ success: false }, formData({ title: "Run a marathon" }));

    expect(result).toEqual({ success: false, error: "Couldn't add the goal. Try again." });
  });
});
