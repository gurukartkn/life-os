import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutLogExercise } from "./workout-log-exercise";
import type { SetData } from "./set-row";

vi.mock("@/actions/workout-logs", () => ({ saveSetLog: vi.fn(), deleteSetLog: vi.fn() }));

const empty = (setNumber: number): SetData => ({ id: null, setNumber, weight: null, reps: null, durationSeconds: null });

function renderExercise(props: Partial<React.ComponentProps<typeof WorkoutLogExercise>> = {}) {
  render(
    <WorkoutLogExercise
      workoutLogId="log-1"
      exerciseId="ex-1"
      exerciseName="Bench press"
      exerciseType="weight_training"
      muscleGroups={["Chest", "Triceps"]}
      targetSets={3}
      targetReps="8"
      initialSets={[empty(1), empty(2)]}
      {...props}
    />
  );
}

describe("WorkoutLogExercise", () => {
  it("shows the name, type and muscle groups, the target and weight/reps columns", () => {
    renderExercise();

    expect(screen.getByRole("heading", { name: "Bench press" })).toBeInTheDocument();
    expect(screen.getByText("Weight training · Chest, Triceps")).toBeInTheDocument();
    expect(screen.getByText("Target 3 × 8")).toBeInTheDocument();
    expect(screen.getByLabelText("Set 2 reps")).toBeInTheDocument();
  });

  it("reads a target with no reps as a number of sets", () => {
    renderExercise({ targetReps: null, targetSets: 2 });
    expect(screen.getByText("Target 2 sets")).toBeInTheDocument();
  });

  it("adds a set after the last one, and removes one", async () => {
    const user = userEvent.setup();
    renderExercise();

    await user.click(screen.getByRole("button", { name: "Add set" }));
    expect(screen.getByLabelText("Set 3 weight")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove set 2" }));
    expect(screen.queryByLabelText("Set 2 weight")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Set 3 weight")).toBeInTheDocument();
  });

  it("uses a single duration column for cardio", () => {
    renderExercise({ exerciseType: "cardio" });

    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.queryByText("Weight")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Set 1 duration in seconds")).toBeInTheDocument();
  });
});
