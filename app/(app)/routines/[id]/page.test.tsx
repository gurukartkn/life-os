import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RoutineDetailPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { periodStartFor } from "@/lib/dates";
import {
  makePendingQueryBuilder,
  makeQueryBuilder,
  makeSupabaseMock,
  queryResult,
  type SupabaseMock,
} from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/routines", () => ({
  toggleRoutineItem: vi.fn(),
  archiveRoutineItem: vi.fn(),
  addRoutineItem: vi.fn(),
  deleteRoutine: vi.fn(),
}));
vi.mock("@/actions/links", () => ({
  linkRoutineToGoal: vi.fn(),
  unlinkRoutineGoal: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

const params = Promise.resolve({ id: "r1" });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function answer(overrides: Record<string, unknown>) {
  const answers: Record<string, unknown> = {
    routines: { id: "r1", title: "Bike maintenance", cadence: "weekly" },
    routine_items: [
      { id: "i1", title: "Wash" },
      { id: "i2", title: "Lube chain" },
    ],
    routine_completions: [],
    goals: [],
    links: null,
    ...overrides,
  };
  supabase.from.mockImplementation((table: string) =>
    makeQueryBuilder(queryResult(answers[table] as never, null))
  );
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("RoutineDetailPage", () => {
  // Regression for backlog #6: these five reads used to run one after another (~5 round trips).
  it("issues all five reads together, before any of them has returned", async () => {
    supabase.from.mockImplementation(() => makePendingQueryBuilder());

    void RoutineDetailPage({ params });
    await flush();

    expect(supabase.from.mock.calls.map((call) => call[0]).sort()).toEqual([
      "goals",
      "links",
      "routine_completions",
      "routine_items",
      "routines",
    ]);
  });

  it("marks an item done only for the routine's own period (weekly)", async () => {
    answer({
      routine_completions: [
        { routine_item_id: "i1", period_start: periodStartFor("weekly") },
        { routine_item_id: "i2", period_start: "1999-01-04" }, // a past week: must not count
      ],
    });

    render(await RoutineDetailPage({ params }));

    expect(screen.getAllByRole("checkbox", { name: "Mark as not done" })).toHaveLength(1);
    expect(screen.getAllByRole("checkbox", { name: "Mark as done" })).toHaveLength(1);
  });

  it("uses the daily period for a daily routine", async () => {
    answer({
      routines: { id: "r1", title: "Morning", cadence: "daily" },
      routine_completions: [
        { routine_item_id: "i1", period_start: periodStartFor("daily") },
        { routine_item_id: "i2", period_start: "1999-01-01" }, // a past day: must not count
      ],
    });

    render(await RoutineDetailPage({ params }));

    expect(screen.getAllByRole("checkbox", { name: "Mark as not done" })).toHaveLength(1);
  });

  it("shows the linked goal's title", async () => {
    answer({
      goals: [{ id: "g1", title: "Ride 100 km" }],
      links: { id: "l1", target_id: "g1" },
    });

    render(await RoutineDetailPage({ params }));

    expect(screen.getByText(/Ride 100 km/)).toBeInTheDocument();
  });

  it("returns not-found for a routine that does not exist", async () => {
    answer({ routines: null });

    await expect(RoutineDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
