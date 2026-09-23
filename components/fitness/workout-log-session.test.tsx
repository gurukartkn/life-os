import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutLogSession, type ExerciseCardData } from "./workout-log-session";
import { finishWorkoutLog } from "@/actions/workout-logs";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/actions/workout-logs", () => ({ finishWorkoutLog: vi.fn() }));

const mockedFinishWorkoutLog = vi.mocked(finishWorkoutLog);

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

beforeEach(() => {
  pushMock.mockReset();
  mockedFinishWorkoutLog.mockReset();
});

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

  it("finishes the workout log and navigates to its past-log view", async () => {
    mockedFinishWorkoutLog.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[CARD_A]} />);

    await user.click(screen.getByRole("button", { name: "Finish workout" }));

    await waitFor(() => expect(mockedFinishWorkoutLog).toHaveBeenCalledWith("log-1"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/fitness/logs/log-1"));
  });

  it("shows an error and does not navigate when finishing fails", async () => {
    mockedFinishWorkoutLog.mockResolvedValue({ success: false, error: "Couldn't finish the workout. Try again." });
    const user = userEvent.setup();
    render(<WorkoutLogSession workoutLogId="log-1" workoutName="Push Day" exerciseCards={[CARD_A]} />);

    await user.click(screen.getByRole("button", { name: "Finish workout" }));

    expect(await screen.findByText("Couldn't finish the workout. Try again.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
