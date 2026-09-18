import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutLogExercise } from "./workout-log-exercise";
import { saveSetLog } from "@/actions/workout-logs";
import type { SetData } from "@/components/fitness/set-row";

vi.mock("@/actions/workout-logs", () => ({
  saveSetLog: vi.fn(),
  deleteSetLog: vi.fn(),
}));

const mockedSave = vi.mocked(saveSetLog);

const UNSAVED_SET: SetData = { id: null, setNumber: 1, weight: null, reps: null, durationSeconds: null };

function completionDot() {
  return document.querySelector('span[aria-hidden="true"]');
}

describe("WorkoutLogExercise", () => {
  beforeEach(() => {
    mockedSave.mockReset();
  });

  it("appends a new set row when '+ Add set' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WorkoutLogExercise
        workoutLogId="log-1"
        exerciseId="ex-1"
        exerciseName="Bench Press"
        exerciseType="weight_training"
        muscleGroups={[]}
        targetSets={3}
        initialSets={[UNSAVED_SET]}
      />
    );

    expect(screen.queryByLabelText("Set 2 weight")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Add set" }));

    expect(screen.getByLabelText("Set 2 weight")).toBeInTheDocument();
  });

  it("shows the completion checkmark once savedCount reaches targetSets, and fires onCompleteChange", async () => {
    mockedSave.mockResolvedValue({ success: true });
    const onCompleteChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkoutLogExercise
        workoutLogId="log-1"
        exerciseId="ex-1"
        exerciseName="Bench Press"
        exerciseType="weight_training"
        muscleGroups={[]}
        targetSets={1}
        initialSets={[UNSAVED_SET]}
        onCompleteChange={onCompleteChange}
      />
    );

    await waitFor(() => expect(onCompleteChange).toHaveBeenCalledWith(false));
    expect(completionDot()?.className).not.toContain("bg-teal");

    await user.type(screen.getByLabelText("Set 1 weight"), "135");
    await user.type(screen.getByLabelText("Set 1 reps"), "10");
    await user.click(screen.getByRole("button", { name: "Save set 1" }));

    await waitFor(() => expect(onCompleteChange).toHaveBeenLastCalledWith(true));
    expect(completionDot()?.className).toContain("bg-teal");
  });
});
