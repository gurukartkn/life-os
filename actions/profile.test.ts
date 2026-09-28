import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDisplayName, updateTimezone } from "@/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type ProfileSupabaseMock = SupabaseMock & {
  auth: SupabaseMock["auth"] & { updateUser: ReturnType<typeof vi.fn>; refreshSession: ReturnType<typeof vi.fn> };
};

let supabase: ProfileSupabaseMock;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  const base = makeSupabaseMock();
  supabase = {
    ...base,
    auth: {
      ...base.auth,
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(supabase as never);
});

describe("updateDisplayName", () => {
  it("rejects an empty name with a field error, without calling Auth", async () => {
    const result = await updateDisplayName({ success: false }, formData({ display_name: "  " }));

    expect(result).toEqual({ success: false, error: "Enter a name.", fieldErrors: { display_name: "Enter a name." } });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("saves the trimmed name to user_metadata and refreshes the session", async () => {
    const { revalidatePath } = await import("next/cache");
    const result = await updateDisplayName({ success: false }, formData({ display_name: " Guru K " }));

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { display_name: "Guru K" } });
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(result).toEqual({ success: true });
  });

  it("maps an Auth error to a friendly message", async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { message: "boom" } });

    const result = await updateDisplayName({ success: false }, formData({ display_name: "Guru" }));

    expect(result).toEqual({ success: false, error: "Couldn't save your name. Try again." });
  });
});

describe("updateTimezone", () => {
  it("rejects a zone the runtime does not know", async () => {
    const result = await updateTimezone("Mars/Olympus_Mons");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("updates the user's user_settings row", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await updateTimezone("Asia/Kolkata");

    expect(supabase.from).toHaveBeenCalledWith("user_settings");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ timezone: "Asia/Kolkata" });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    expect(await updateTimezone("Asia/Kolkata")).toEqual({
      success: false,
      error: "Couldn't save your timezone. Try again.",
    });
  });
});
