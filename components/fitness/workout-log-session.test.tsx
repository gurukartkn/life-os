import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutLogSession, type ExerciseCardData } from "./workout-log-session";

vi.mock("@/components/fitness/workout-log-exercise", () => ({
  WorkoutLogExercise: ({
    exerciseName,
    onCompleteChange,
  }: {
    exerciseName: string;
    onCompleteChange?: (isComplete: boolean) => void;
  }) => (
    <div>
      <span>{exerciseName}</span>
      <button onClick={() => onCompleteChange?.(true)}>{`Complete ${exerciseName}`}</button>
      <button onClick={() => onCompleteChange?.(false)}>{`Incomplete ${exerciseName}`}</button>
    </div>
  ),
}));

const CARD_A: ExerciseCardData = {
  workoutExerciseId: "we-1",
  exerciseId: "ex-1",
  exerciseName: "Bench Press",
  exerciseType: "weight_training",
  muscleGroups: [],
  targetSets: 3,
  sets: [],
  savedCount: 3,
};

const CARD_B: ExerciseCardData = {
  workoutExerciseId: "we-2",
  exerciseId: "ex-2",
  exerciseName: "Squat",
  exerciseType: "weight_training",
  muscleGroups: [],
  targetSets: 3,
  sets: [],
  savedCount: 1,
};

function progressBar(container: HTMLElement) {
  return container.querySelector(".bg-teal.transition-all") as HTMLElement;
}

describe("WorkoutLogSession", () => {
  it("shows the empty-state message when exerciseCards is empty", () => {
    render(<WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[]} />);

    expect(screen.getByText("This workout has no exercises yet.")).toBeInTheDocument();
    expect(screen.getByText("0 of 0 exercises done")).toBeInTheDocument();
  });

  it("computes initial progress text and bar width from card completion", () => {
    const { container } = render(
      <WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[CARD_A, CARD_B]} />
    );

    expect(screen.getByText("1 of 2 exercises done")).toBeInTheDocument();
    expect(progressBar(container).style.width).toBe("50%");
  });

  it("updates progress text and bar width when a child reports completion", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[CARD_A, CARD_B]} />
    );

    await user.click(screen.getByRole("button", { name: "Complete Squat" }));

    expect(screen.getByText("2 of 2 exercises done")).toBeInTheDocument();
    expect(progressBar(container).style.width).toBe("100%");

    await user.click(screen.getByRole("button", { name: "Incomplete Squat" }));

    expect(screen.getByText("1 of 2 exercises done")).toBeInTheDocument();
    expect(progressBar(container).style.width).toBe("50%");
  });

  it("renders the Finish workout link pointing to /fitness", () => {
    render(<WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[CARD_A]} />);

    expect(screen.getByRole("link", { name: "Finish workout" })).toHaveAttribute("href", "/fitness");
  });
});
