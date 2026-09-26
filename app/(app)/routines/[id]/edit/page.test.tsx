import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditRoutinePage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/routines", () => ({ createRoutine: vi.fn(), updateRoutine: vi.fn(), setRoutineActive: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("EditRoutinePage", () => {
  it("prefills the details, schedule and items, archived items last", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder(
        queryResult({
          id: "r1",
          title: "Bike maintenance",
          time_of_day: "morning",
          frequency: "specific_days",
          times_per_week: null,
          weekdays: [7],
          routine_items: [
            { id: "i2", title: "Tyre pressure check", sort_order: 0, is_active: false, repeat_rule: "every_time", repeat_every: null },
            { id: "i1", title: "Chain clean & lube", sort_order: 1, is_active: true, repeat_rule: "every_nth", repeat_every: 2 },
          ],
        })
      )
    );

    render(await EditRoutinePage({ params: Promise.resolve({ id: "r1" }) }));

    expect(screen.getByRole("heading", { name: "Edit routine" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Bike maintenance");
    expect(screen.getByRole("button", { name: "Morning" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sun" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Item name")).toHaveValue("Chain clean & lube");
    expect(screen.getByText("Every 2nd time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archived \(1\)/ })).toBeInTheDocument();
  });

  it("calls notFound for a routine that doesn't exist (or isn't the caller's)", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null)));

    await expect(EditRoutinePage({ params: Promise.resolve({ id: "r1" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
