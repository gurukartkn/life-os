import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetRow, type SetData } from "./set-row";
import { deleteSetLog, saveSetLog } from "@/actions/workout-logs";

vi.mock("@/actions/workout-logs", () => ({
  saveSetLog: vi.fn(),
  deleteSetLog: vi.fn(),
}));

const mockedSave = vi.mocked(saveSetLog);
const mockedDelete = vi.mocked(deleteSetLog);

const EMPTY_SET: SetData = { id: null, setNumber: 1, weight: null, reps: null, durationSeconds: null };

describe("SetRow", () => {
  beforeEach(() => {
    mockedSave.mockReset();
    mockedDelete.mockReset();
  });

  it("saves the entered weight and reps for a weight-training set", async () => {
    mockedSave.mockResolvedValue({ success: true });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <SetRow
        workoutLogId="log-1"
        exerciseId="exercise-1"
        exerciseType="weight_training"
        set={EMPTY_SET}
        onSaved={onSaved}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Set 1 weight"), "135");
    await user.type(screen.getByLabelText("Set 1 reps"), "10");
    await user.click(screen.getByRole("button", { name: "Save set 1" }));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith({
        workout_log_id: "log-1",
        exercise_id: "exercise-1",
        set_number: 1,
        weight: 135,
        reps: 10,
        duration_seconds: undefined,
      })
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("saves a duration for a cardio set", async () => {
    mockedSave.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <SetRow
        workoutLogId="log-1"
        exerciseId="exercise-1"
        exerciseType="cardio"
        set={EMPTY_SET}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Set 1 duration in seconds"), "60");
    await user.click(screen.getByRole("button", { name: "Save set 1" }));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith({
        workout_log_id: "log-1",
        exercise_id: "exercise-1",
        set_number: 1,
        weight: undefined,
        reps: undefined,
        duration_seconds: 60,
      })
    );
  });

  it("surfaces a server error returned by the action", async () => {
    mockedSave.mockResolvedValue({ success: false, error: "Couldn't save the set. Try again." });
    const user = userEvent.setup();
    render(
      <SetRow
        workoutLogId="log-1"
        exerciseId="exercise-1"
        exerciseType="weight_training"
        set={EMPTY_SET}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Save set 1" }));

    expect(await screen.findByText("Couldn't save the set. Try again.")).toBeInTheDocument();
  });

  it("calls deleteSetLog when the delete button is clicked on a saved set", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    render(
      <SetRow
        workoutLogId="log-1"
        exerciseId="exercise-1"
        exerciseType="weight_training"
        set={{ id: "set-1", setNumber: 1, weight: 135, reps: 10, durationSeconds: null }}
        onSaved={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete set 1" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("set-1", "log-1"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});
