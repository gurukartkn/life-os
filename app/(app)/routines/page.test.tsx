import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RoutinesPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/routines", () => ({ toggleRoutineItem: vi.fn(), setRoutineActive: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

// Reads: user_settings (timezone), then routines and routine_completions together.
function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("RoutinesPage", () => {
  it("shows today's progress and each routine's due items", async () => {
    queue(
      queryResult({ timezone: "UTC" }),
      queryResult([
        {
          id: "r1",
          title: "Morning stretch",
          time_of_day: "morning",
          frequency: "daily",
          times_per_week: null,
          weekdays: null,
          is_active: true,
          routine_items: [
            { id: "i1", title: "Neck rolls", sort_order: 0, is_active: true, repeat_rule: "every_time", repeat_every: null },
          ],
        },
      ]),
      queryResult([])
    );

    render(await RoutinesPage());

    expect(screen.getByRole("heading", { name: "Routines", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Today's progress" })).toHaveTextContent("0%");
    expect(screen.getByRole("heading", { name: "Morning" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Morning stretch" })).toHaveAttribute("href", "/routines/r1/edit");
    expect(screen.getByRole("checkbox", { name: "Check Neck rolls" })).not.toBeChecked();
  });

  it("shows the empty state with its own New routine link", async () => {
    queue(queryResult({ timezone: "UTC" }), queryResult([]), queryResult([]));

    render(await RoutinesPage());

    expect(screen.getByText("No routines yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "New routine" })).toHaveLength(2);
  });

  it("shows the load-failed state", async () => {
    queue(queryResult({ timezone: "UTC" }), queryResult(null, { message: "down" }), queryResult([]));

    render(await RoutinesPage());

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load routines");
  });
});
