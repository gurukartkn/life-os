import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditWorkoutPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/workouts", () => ({ updateWorkout: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockedCreateClient = vi.mocked(createClient);
const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const BENCH = "5b6f3d40-2222-4a11-8b11-222222222222";
const OLD_EX = "5b6f3d40-3333-4a11-8b11-333333333333";

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("EditWorkoutPage", () => {
  it("prefills the form from the workout, its rows and the active exercise list", async () => {
    queue(
      queryResult({ id: WORKOUT_ID, name: "Push Day", notes: "Heavy" }),
      queryResult([
        {
          id: "row-1",
          exercise_id: BENCH,
          target_sets: 3,
          target_reps: "8-10",
          sort_order: 0,
          exercises: { id: BENCH, name: "Bench", is_active: true },
        },
      ]),
      queryResult([{ id: BENCH, name: "Bench" }])
    );

    const jsx = await EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) });
    render(jsx);

    expect(screen.getByLabelText("Name")).toHaveValue("Push Day");
    expect(screen.getByLabelText("Exercise 1", { exact: true })).toHaveValue(BENCH);
  });

  it("still offers an archived exercise the workout already uses, alongside the active ones", async () => {
    queue(
      queryResult({ id: WORKOUT_ID, name: "Push Day", notes: null }),
      queryResult([
        {
          id: "row-1",
          exercise_id: OLD_EX,
          target_sets: 3,
          target_reps: null,
          sort_order: 0,
          exercises: { id: OLD_EX, name: "Discontinued move", is_active: false },
        },
      ]),
      queryResult([{ id: BENCH, name: "Bench" }])
    );

    const jsx = await EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) });
    render(jsx);

    const select = screen.getByLabelText("Exercise 1", { exact: true });
    expect(select).toHaveValue(OLD_EX);
    expect(screen.getByRole("option", { name: "Discontinued move" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bench" })).toBeInTheDocument();
  });

  it("calls notFound when the workout does not exist (or isn't the caller's)", async () => {
    // All three reads fire together, so the other two still need a queued result even
    // though the missing workout is what actually decides the outcome.
    queue(queryResult(null), queryResult([]), queryResult([]));

    await expect(EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
