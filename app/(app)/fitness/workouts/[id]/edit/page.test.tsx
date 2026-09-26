import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditWorkoutPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/workouts", () => ({ updateWorkout: vi.fn(), createWorkout: vi.fn(), deleteWorkout: vi.fn() }));
vi.mock("@/actions/exercises", () => ({ createExerciseWithTags: vi.fn(), updateExercise: vi.fn(), archiveExercise: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));
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

// Read order: workouts, workout_exercises, then the editor data (exercises,
// muscle_groups, equipment) — all issued together.
function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

function exercise(id: string, name: string, isActive: boolean) {
  return {
    id,
    name,
    exercise_type: "weight_training",
    is_active: isActive,
    exercise_muscle_groups: [{ muscle_groups: { id: "mg-1", name: "Chest", is_active: true } }],
    exercise_equipment: [],
  };
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("EditWorkoutPage", () => {
  it("prefills the name and the exercise rows with their targets", async () => {
    queue(
      queryResult({ id: WORKOUT_ID, name: "Push Day", notes: "Heavy" }),
      queryResult([{ id: "row-1", exercise_id: BENCH, target_sets: 3, target_reps: "8-10" }]),
      queryResult([exercise(BENCH, "Bench press", true)]),
      queryResult([]),
      queryResult([])
    );

    render(await EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) }));

    expect(screen.getByRole("heading", { name: "Edit workout" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workout name")).toHaveValue("Push Day");
    expect(screen.getByText("Bench press")).toBeInTheDocument();
    expect(screen.getByText("Weight training · Chest")).toBeInTheDocument();
    expect(screen.getByLabelText("Target sets for Bench press")).toHaveValue("3");
    expect(screen.getByLabelText("Target reps for Bench press")).toHaveValue("8-10");
  });

  it("still shows an archived exercise the workout already uses", async () => {
    queue(
      queryResult({ id: WORKOUT_ID, name: "Push Day", notes: null }),
      queryResult([{ id: "row-1", exercise_id: OLD_EX, target_sets: 3, target_reps: null }]),
      queryResult([exercise(BENCH, "Bench press", true), exercise(OLD_EX, "Discontinued move", false)]),
      queryResult([]),
      queryResult([])
    );

    render(await EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) }));

    expect(screen.getByText("Discontinued move")).toBeInTheDocument();
  });

  it("calls notFound when the workout does not exist (or isn't the caller's)", async () => {
    queue(queryResult(null), queryResult([]), queryResult([]), queryResult([]), queryResult([]));

    await expect(EditWorkoutPage({ params: Promise.resolve({ id: WORKOUT_ID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
