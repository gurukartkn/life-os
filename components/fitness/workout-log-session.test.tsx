import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatElapsed, WorkoutLogSession, type ExerciseCardData } from "./workout-log-session";
import { finishWorkoutLog } from "@/actions/workout-logs";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/actions/workout-logs", () => ({ finishWorkoutLog: vi.fn(), saveSetLog: vi.fn(), deleteSetLog: vi.fn() }));

const mockedFinish = vi.mocked(finishWorkoutLog);
const LOG_ID = "5b6f3d40-1111-4a11-8b11-111111111111";

const card: ExerciseCardData = {
  workoutExerciseId: "we-1",
  exerciseId: "ex-1",
  exerciseName: "Bench press",
  exerciseType: "weight_training",
  muscleGroups: ["Chest"],
  targetSets: 1,
  targetReps: "8",
  sets: [{ id: null, setNumber: 1, weight: null, reps: null, durationSeconds: null }],
};

function renderSession(cards: ExerciseCardData[] = [card]) {
  render(
    <WorkoutLogSession
      workoutLogId={LOG_ID}
      workoutName="Upper body A"
      startedLabel="Started 6:42 pm"
      startedAt={new Date().toISOString()}
      exerciseCards={cards}
    />
  );
}

beforeEach(() => {
  mockedFinish.mockReset();
  push.mockReset();
});

describe("formatElapsed", () => {
  it("reads minutes and seconds, then hours past the hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed((24 * 60 + 18) * 1000)).toBe("24:18");
    expect(formatElapsed((3600 + 2 * 60 + 5) * 1000)).toBe("1:02:05");
  });
});

describe("WorkoutLogSession", () => {
  it("shows the workout, when it started, a timer, In progress and each exercise", () => {
    renderSession();

    expect(screen.getByRole("heading", { name: "Upper body A" })).toBeInTheDocument();
    expect(screen.getByText("Started 6:42 pm")).toBeInTheDocument();
    expect(screen.getByLabelText("Time elapsed")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bench press" })).toBeInTheDocument();
  });

  it("finishes the session and opens its log", async () => {
    mockedFinish.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderSession();

    await user.click(screen.getByRole("button", { name: "Finish workout" }));

    await waitFor(() => expect(mockedFinish).toHaveBeenCalledWith(LOG_ID));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/fitness/logs/${LOG_ID}`));
  });

  it("stays put and says so when finishing fails", async () => {
    mockedFinish.mockResolvedValue({ success: false, error: "Couldn't finish the workout. Try again." });
    const user = userEvent.setup();
    renderSession();

    await user.click(screen.getByRole("button", { name: "Finish workout" }));

    expect(await screen.findByText("Couldn't finish the workout. Try again.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("says so when the workout has no exercises", () => {
    renderSession([]);
    expect(screen.getByText("This workout has no exercises yet.")).toBeInTheDocument();
  });
});
