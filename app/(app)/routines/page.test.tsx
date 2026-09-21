import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RoutinesPage from "./page";
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
vi.mock("@/actions/routines", () => ({ deleteRoutine: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("RoutinesPage", () => {
  // Regression for backlog #6: these three reads used to run one after another.
  it("issues its three reads together, before any of them has returned", async () => {
    supabase.from.mockImplementation(() => makePendingQueryBuilder());

    void RoutinesPage();
    await flush();

    expect(supabase.from.mock.calls.map((call) => call[0]).sort()).toEqual([
      "routine_completions",
      "routine_items",
      "routines",
    ]);
  });

  it("counts only the current period's completions for each routine's own items", async () => {
    const daily = periodStartFor("daily");
    const weekly = periodStartFor("weekly");
    const other = "2000-01-03";
    const answers: Record<string, unknown> = {
      routines: [
        { id: "r1", title: "Morning", cadence: "daily", created_at: "2026-01-02" },
        { id: "r2", title: "Weekly review", cadence: "weekly", created_at: "2026-01-01" },
      ],
      routine_items: [
        { id: "i1", routine_id: "r1" },
        { id: "i2", routine_id: "r1" },
        { id: "i3", routine_id: "r2" },
      ],
      routine_completions: [
        { routine_item_id: "i1", period_start: daily }, // counts for r1
        { routine_item_id: "i2", period_start: other }, // a past period: must not count
        { routine_item_id: "i3", period_start: weekly }, // counts for r2
        { routine_item_id: "i3", period_start: other }, // a past period: must not count
      ],
    };
    supabase.from.mockImplementation((table: string) =>
      makeQueryBuilder(queryResult(answers[table] as never, null))
    );

    render(await RoutinesPage());

    expect(screen.getByText("1 of 2 done")).toBeInTheDocument(); // Morning
    expect(screen.getByText("1 of 1 done")).toBeInTheDocument(); // Weekly review
  });

  it("shows the empty state with no routines", async () => {
    supabase.from.mockImplementation(() => makeQueryBuilder(queryResult([], null)));

    render(await RoutinesPage());

    expect(screen.getByText("No routines yet.")).toBeInTheDocument();
  });
});
