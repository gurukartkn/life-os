import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetRow, type SetData } from "./set-row";
import { deleteSetLog, saveSetLog } from "@/actions/workout-logs";

vi.mock("@/actions/workout-logs", () => ({ saveSetLog: vi.fn(), deleteSetLog: vi.fn() }));

const mockedSave = vi.mocked(saveSetLog);
const mockedDelete = vi.mocked(deleteSetLog);
const LOG_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const EX_ID = "5b6f3d40-2222-4a11-8b11-222222222222";

const EMPTY: SetData = { id: null, setNumber: 1, weight: null, reps: null, durationSeconds: null };

function renderRow(set: SetData = EMPTY, exerciseType = "weight_training") {
  const onSaved = vi.fn();
  const onRemoved = vi.fn();
  render(
    <div>
      <SetRow
        workoutLogId={LOG_ID}
        exerciseId={EX_ID}
        exerciseType={exerciseType}
        set={set}
        onSaved={onSaved}
        onRemoved={onRemoved}
      />
      <button type="button">Elsewhere</button>
    </div>
  );
  return { onSaved, onRemoved };
}

beforeEach(() => {
  mockedSave.mockReset();
  mockedDelete.mockReset();
});

describe("SetRow", () => {
  it("saves weight and reps when focus leaves the row", async () => {
    mockedSave.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onSaved } = renderRow();

    await user.type(screen.getByLabelText("Set 1 weight"), "60");
    await user.type(screen.getByLabelText("Set 1 reps"), "8");
    expect(mockedSave).not.toHaveBeenCalled(); // moving between the row's own fields doesn't save
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith({
        workout_log_id: LOG_ID,
        exercise_id: EX_ID,
        set_number: 1,
        weight: 60,
        reps: 8,
        duration_seconds: undefined,
      })
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ weight: 60, reps: 8 })));
  });

  it("does not save a weight with no reps yet", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.type(screen.getByLabelText("Set 1 weight"), "60");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("does not save when nothing changed", async () => {
    const user = userEvent.setup();
    renderRow({ id: "s1", setNumber: 1, weight: 60, reps: 8, durationSeconds: null });

    await user.click(screen.getByLabelText("Set 1 reps"));
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("takes a duration in seconds for cardio", async () => {
    mockedSave.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderRow(EMPTY, "cardio");

    expect(screen.queryByLabelText("Set 1 weight")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Set 1 duration in seconds"), "300");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    await waitFor(() => expect(mockedSave).toHaveBeenCalledWith(expect.objectContaining({ duration_seconds: 300 })));
  });

  it("shows a save failure on the row", async () => {
    mockedSave.mockResolvedValue({ success: false, error: "Couldn't save the set. Try again." });
    const user = userEvent.setup();
    renderRow();

    await user.type(screen.getByLabelText("Set 1 reps"), "8");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(await screen.findByText("Couldn't save the set. Try again.")).toBeInTheDocument();
  });

  it("removes an unsaved set without calling the server", async () => {
    const user = userEvent.setup();
    const { onRemoved } = renderRow();

    await user.click(screen.getByRole("button", { name: "Remove set 1" }));

    expect(mockedDelete).not.toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalled();
  });

  it("deletes a saved set, then removes it", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onRemoved } = renderRow({ id: "s1", setNumber: 1, weight: 60, reps: 8, durationSeconds: null });

    await user.click(screen.getByRole("button", { name: "Remove set 1" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("s1", LOG_ID));
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  });
});
