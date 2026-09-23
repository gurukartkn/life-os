import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PastLogView } from "./past-log-view";
import type { PastWorkoutLog } from "@/lib/queries/fitness";

const LOG: PastWorkoutLog = {
  id: "log-1",
  workoutId: "w-1",
  workoutName: "Push Day (renamed)",
  performedOn: "2026-09-20",
  performedAt: "2026-09-20T08:00:00.000Z",
  notes: null,
  exercises: [
    {
      workoutExerciseId: "we-1",
      exerciseId: "ex-fly",
      exerciseName: "Cable fly",
      exerciseType: "weight_training",
      targetSets: 3,
      targetReps: "10-12",
      sets: [],
      removedFromWorkout: false,
    },
    {
      workoutExerciseId: "we-2",
      exerciseId: "ex-bench",
      exerciseName: "Bench press",
      exerciseType: "weight_training",
      targetSets: 3,
      targetReps: "8",
      sets: [
        { id: "s1", setNumber: 1, weight: 100, reps: 8, durationSeconds: null },
        { id: "s2", setNumber: 2, weight: 105, reps: 6, durationSeconds: null },
      ],
      removedFromWorkout: false,
    },
    {
      workoutExerciseId: null,
      exerciseId: "ex-row",
      exerciseName: "Barbell row",
      exerciseType: "weight_training",
      targetSets: null,
      targetReps: null,
      sets: [{ id: "s3", setNumber: 1, weight: 60, reps: 10, durationSeconds: null }],
      removedFromWorkout: true,
    },
  ],
};

describe("PastLogView", () => {
  it("renders the workout name, exercises and their sets", () => {
    render(<PastLogView log={LOG} timeZone="UTC" />);

    expect(screen.getByText("Push Day (renamed)")).toBeInTheDocument();
    expect(screen.getByText("Cable fly")).toBeInTheDocument();
    expect(screen.getByText("No sets logged.")).toBeInTheDocument();
    expect(screen.getByText("Set 1: 100 × 8")).toBeInTheDocument();
    expect(screen.getByText("Set 2: 105 × 6")).toBeInTheDocument();
  });

  it("flags a removed exercise but still shows its sets", () => {
    render(<PastLogView log={LOG} timeZone="UTC" />);

    expect(screen.getByText("Barbell row")).toBeInTheDocument();
    expect(screen.getByText("Removed from workout")).toBeInTheDocument();
    expect(screen.getByText("Set 1: 60 × 10")).toBeInTheDocument();
  });

  it("falls back to 'Ad-hoc workout' when the log has no workout", () => {
    render(<PastLogView log={{ ...LOG, workoutName: null }} timeZone="UTC" />);

    expect(screen.getByText("Ad-hoc workout")).toBeInTheDocument();
  });
});
