import { beforeEach, describe, expect, it, vi } from "vitest";
import FitnessPage from "./page";
import { createClient } from "@/lib/supabase/server";
import {
  makePendingQueryBuilder,
  makeSupabaseMock,
  type SupabaseMock,
} from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/workouts", () => ({ deleteWorkout: vi.fn() }));
vi.mock("@/actions/workout-logs", () => ({ startWorkoutLog: vi.fn() }));
vi.mock("@/actions/exercises", () => ({ createExercise: vi.fn(), archiveExercise: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
  supabase.from.mockImplementation(() => makePendingQueryBuilder());
});

describe("FitnessPage", () => {
  // Regression for backlog #6: the workouts and recent-logs reads used to run in sequence.
  it("on the Workouts tab, issues the workouts and recent-logs reads together", async () => {
    void FitnessPage({ searchParams: Promise.resolve({}) });
    await flush();

    expect(supabase.from.mock.calls.map((call) => call[0]).sort()).toEqual([
      "workout_logs",
      "workouts",
    ]);
  });

  it("on the Exercises tab, reads only exercises", async () => {
    void FitnessPage({ searchParams: Promise.resolve({ tab: "exercises" }) });
    await flush();

    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["exercises"]);
  });
});
