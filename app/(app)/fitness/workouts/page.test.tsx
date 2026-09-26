import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WorkoutsPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/workout-logs", () => ({ startWorkoutLog: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

// Workouts and recent sessions are read together: workouts first, then workout_logs.
function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

const group = (name: string) => ({ muscle_groups: { name } });

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("WorkoutsPage", () => {
  it("lists each workout with its size and main muscle groups, and recent sessions with length and sets", async () => {
    queue(
      queryResult([
        {
          id: "w1",
          name: "Upper body A",
          workout_exercises: [
            { sort_order: 1, exercises: { exercise_muscle_groups: [group("Shoulders")] } },
            { sort_order: 0, exercises: { exercise_muscle_groups: [group("Chest"), group("Triceps")] } },
          ],
          workout_logs: [],
        },
      ]),
      queryResult([
        {
          id: "l1",
          performed_at: "2026-09-20T09:00:00.000Z",
          created_at: "2026-09-20T08:05:00.000Z",
          workouts: { name: "Legs" },
          set_logs: [{ count: 16 }],
        },
      ])
    );

    render(await WorkoutsPage());

    expect(screen.getByRole("heading", { name: "Workouts" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "New workout" })[0]).toHaveAttribute("href", "/fitness/workouts/new");
    const row = screen.getByText("Upper body A").closest('[data-slot="workout-row"]') as HTMLElement;
    expect(within(row).getByText("2 exercises · Chest, Triceps, Shoulders")).toBeInTheDocument();
    expect(within(row).getByText("Not done yet")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Start Upper body A" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Edit Upper body A" })).toHaveAttribute(
      "href",
      "/fitness/workouts/w1/edit"
    );
    expect(screen.getByRole("heading", { name: "Recent sessions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Legs/ })).toHaveAttribute("href", "/fitness/logs/l1");
    expect(screen.getByText("55 min · 16 sets")).toBeInTheDocument();
  });

  it("shows the empty state with its own New workout link", async () => {
    queue(queryResult([]), queryResult([]));

    render(await WorkoutsPage());

    expect(screen.getByText("No workouts yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "New workout" })).toHaveLength(2);
  });

  it("shows the load-failed state when the workouts can't be read", async () => {
    queue(queryResult(null, { message: "down" }), queryResult([]));

    render(await WorkoutsPage());

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load workouts");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
