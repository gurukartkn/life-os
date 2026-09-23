import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutEditForm } from "./workout-edit-form";
import { updateWorkout } from "@/actions/workouts";
import type { WorkoutUpdateInput } from "@/lib/validations/fitness";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/actions/workouts", () => ({ updateWorkout: vi.fn() }));

const mockedUpdate = vi.mocked(updateWorkout);

const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const ROW_1 = "5b6f3d40-2222-4a11-8b11-222222222222";
const ROW_2 = "5b6f3d40-3333-4a11-8b11-333333333333";
const BENCH = "5b6f3d40-4444-4a11-8b11-444444444444";
const ROW_EX = "5b6f3d40-5555-4a11-8b11-555555555555";
const FLY = "5b6f3d40-6666-4a11-8b11-666666666666";

const EXERCISES = [
  { id: BENCH, name: "Bench" },
  { id: ROW_EX, name: "Row" },
  { id: FLY, name: "Fly" },
];

const WORKOUT: WorkoutUpdateInput = {
  id: WORKOUT_ID,
  name: "Push Day",
  notes: "",
  items: [
    { id: ROW_1, exerciseId: BENCH, targetSets: 3, targetReps: "8-10" },
    { id: ROW_2, exerciseId: ROW_EX, targetSets: 3, targetReps: "" },
  ],
};

describe("WorkoutEditForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    mockedUpdate.mockReset();
  });

  it("submits unchanged rows with their original ids", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<WorkoutEditForm workout={WORKOUT} exercises={EXERCISES} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: WORKOUT_ID,
          items: [
            expect.objectContaining({ id: ROW_1, exerciseId: BENCH }),
            expect.objectContaining({ id: ROW_2, exerciseId: ROW_EX }),
          ],
        })
      )
    );
    expect(pushMock).toHaveBeenCalledWith("/fitness");
  });

  it("gives a newly added row no id, and keeps existing ids after reordering", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<WorkoutEditForm workout={WORKOUT} exercises={EXERCISES} />);

    await user.click(screen.getByRole("button", { name: "Add exercise" }));
    await user.selectOptions(screen.getByLabelText("Exercise 3"), "Fly");
    // Move the new (Fly) row from last to first.
    await user.click(screen.getByRole("button", { name: "Move exercise 3 up" }));
    await user.click(screen.getByRole("button", { name: "Move exercise 2 up" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const submitted = mockedUpdate.mock.calls[0][0];
    expect(submitted.items.map((item) => [item.id, item.exerciseId])).toEqual([
      [undefined, FLY],
      [ROW_1, BENCH],
      [ROW_2, ROW_EX],
    ]);
  });

  it("removes a row and it is simply absent from what's submitted", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<WorkoutEditForm workout={WORKOUT} exercises={EXERCISES} />);

    await user.click(screen.getAllByRole("button", { name: "Remove exercise" })[1]);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const submitted = mockedUpdate.mock.calls[0][0];
    expect(submitted.items).toEqual([expect.objectContaining({ id: ROW_1, exerciseId: BENCH })]);
  });

  it("shows an inline error and does not submit when a new row has no exercise chosen", async () => {
    const user = userEvent.setup();
    render(<WorkoutEditForm workout={WORKOUT} exercises={EXERCISES} />);

    await user.click(screen.getByRole("button", { name: "Add exercise" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Choose an exercise.")).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("shows the server error and does not navigate on failure", async () => {
    mockedUpdate.mockResolvedValue({ success: false, error: "That workout no longer exists." });
    const user = userEvent.setup();
    render(<WorkoutEditForm workout={WORKOUT} exercises={EXERCISES} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("That workout no longer exists.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
