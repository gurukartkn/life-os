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
    // Call order: getPastWorkoutLog and getUserTimezone run together (Promise.all in the
    // page), and getPastWorkoutLog's own workout_logs read starts before its set_logs read
    // (which waits on workout_id) — so workout_logs, then user_settings, then set_logs.
    queue(
      queryResult({
        id: LOG_ID,
        workout_id: null,
        performed_on: "2026-09-20",
        performed_at: "2026-09-20T08:00:00.000Z",
        notes: null,
        workouts: null,
      }),
      queryResult({ timezone: "UTC" }),
      queryResult([
        {
          id: "s1",
          exercise_id: "ex-1",
          set_number: 1,
          weight: 100,
          reps: 8,
          duration_seconds: null,
          created_at: "2026-09-20T08:01:00.000Z",
          exercises: { name: "Bench press", exercise_type: "weight_training" },
        },
      ])
    );

    const jsx = await PastWorkoutLogPage({ params: Promise.resolve({ id: LOG_ID }) });
    render(jsx);

    expect(screen.getByText("Ad-hoc workout")).toBeInTheDocument();
    expect(screen.getByText("Bench press")).toBeInTheDocument();
    expect(screen.getByText("Set 1: 100 × 8")).toBeInTheDocument();
  });

  it("calls notFound for a log id that doesn't exist (or isn't the caller's)", async () => {
    // getUserTimezone still fires alongside the log read, so it needs a queued result too.
    queue(queryResult(null), queryResult({ timezone: "UTC" }));

    await expect(PastWorkoutLogPage({ params: Promise.resolve({ id: LOG_ID }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
