import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PastLogView } from "./past-log-view";
import type { PastLogExercise, PastWorkoutLog } from "@/lib/queries/fitness";

function exercise(overrides: Partial<PastLogExercise>): PastLogExercise {
  return {
    workoutExerciseId: "we-1",
    exerciseId: "ex-1",
    exerciseName: "Bench press",
    exerciseType: "weight_training",
    targetSets: 3,
    targetReps: "8",
    muscleGroups: ["Chest", "Triceps"],
    sets: [],
    removedFromWorkout: false,
    addedAfterSession: false,
    ...overrides,
  };
}

function log(exercises: PastLogExercise[], overrides: Partial<PastWorkoutLog> = {}): PastWorkoutLog {
  return {
    id: "log-1",
    workoutId: "w-1",
    workoutName: "Upper body A",
    performedOn: "2026-09-12",
    performedAt: "2026-09-12T09:48:00.000Z",
    startedAt: "2026-09-12T09:00:00.000Z",
    notes: null,
    setCount: 3,
    exercises,
    ...overrides,
  };
}

const set = (setNumber: number, weight: number, reps: number) => ({
  id: `s${setNumber}`,
  setNumber,
  weight,
  reps,
  durationSeconds: null,
});

describe("PastLogView", () => {
  it("shows the header, when it finished, how long it took and the sets per exercise", () => {
    render(<PastLogView log={log([exercise({ sets: [set(1, 60, 8), set(2, 62.5, 6)] })])} />);

    expect(screen.getByRole("heading", { name: "Upper body A" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit workout" })).toHaveAttribute("href", "/fitness/workouts/w-1/edit");
    expect(screen.getByText(/^Finished .* · Sat 12 Sep$/)).toBeInTheDocument();
    expect(screen.getByText("48 min · 3 sets logged")).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Bench press" });
    expect(within(card).getByText("Weight training · Chest, Triceps")).toBeInTheDocument();
    expect(within(card).getByText("62.5 lb")).toBeInTheDocument();
    expect(within(card).getByText("6")).toBeInTheDocument();
  });

  it("flags an exercise added since the session, with no sets", () => {
    render(<PastLogView log={log([exercise({ addedAfterSession: true })])} />);

    const card = screen.getByRole("region", { name: "Bench press" });
    expect(within(card).getByText("Added after this session")).toBeInTheDocument();
    expect(within(card).getByText("No sets logged")).toBeInTheDocument();
  });

  it("flags an exercise removed from the workout, keeping its sets", () => {
    render(
      <PastLogView
        log={log([exercise({ workoutExerciseId: null, exerciseName: "Lateral raise", removedFromWorkout: true, sets: [set(1, 8, 12)] })])}
      />
    );

    const card = screen.getByRole("region", { name: "Lateral raise" });
    expect(within(card).getByText("removed from workout")).toBeInTheDocument();
    expect(within(card).getByText("8 lb")).toBeInTheDocument();
  });

  it("shows a cardio set as its duration", () => {
    render(
      <PastLogView
        log={log([
          exercise({
            exerciseName: "Treadmill run",
            exerciseType: "cardio",
            sets: [{ id: "c1", setNumber: 1, weight: null, reps: null, durationSeconds: 1500 }],
          }),
        ])}
      />
    );

    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("25:00 min")).toBeInTheDocument();
  });

  it("offers no Edit workout for an ad hoc log", () => {
    render(<PastLogView log={log([], { workoutId: null, workoutName: null })} />);

    expect(screen.getByRole("heading", { name: "Ad-hoc workout" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit workout" })).not.toBeInTheDocument();
  });
});
