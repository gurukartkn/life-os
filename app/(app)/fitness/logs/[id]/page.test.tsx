import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PastWorkoutLogPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const mockedCreateClient = vi.mocked(createClient);
const LOG_ID = "5b6f3d40-1111-4a11-8b11-111111111111";

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("PastWorkoutLogPage", () => {
  it("renders the past log for a real log id", async () => {
    // An ad hoc log has no workout, so only workout_logs and then set_logs are read.
    queue(
      queryResult({
        id: LOG_ID,
        workout_id: null,
        performed_on: "2026-09-20",
        performed_at: "2026-09-20T08:48:00.000Z",
        created_at: "2026-09-20T08:00:00.000Z",
        notes: null,
        workouts: null,
      }),
      queryResult([
        {
          id: "s1",
          exercise_id: "ex-1",
          set_number: 1,
          weight: 100,
          reps: 8,
          duration_seconds: null,
          created_at: "2026-09-20T08:01:00.000Z",
          exercises: { name: "Bench press", exercise_type: "weight_training", exercise_muscle_groups: [] },
        },
      ])
    );

    render(await PastWorkoutLogPage({ params: Promise.resolve({ id: LOG_ID }) }));

    expect(screen.getByRole("heading", { name: "Ad-hoc workout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bench press" })).toBeInTheDocument();
    expect(screen.getByText("48 min · 1 set logged")).toBeInTheDocument();
    expect(screen.getByText("100 lb")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("calls notFound for a log id that doesn't exist (or isn't the caller's)", async () => {
    queue(queryResult(null));

    await expect(PastWorkoutLogPage({ params: Promise.resolve({ id: LOG_ID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
