import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteWorkoutButton } from "./delete-workout-button";
import { deleteWorkout } from "@/actions/workouts";

vi.mock("@/actions/workouts", () => ({
  deleteWorkout: vi.fn(),
}));

const mockedDeleteWorkout = vi.mocked(deleteWorkout);

describe("DeleteWorkoutButton", () => {
  beforeEach(() => {
    mockedDeleteWorkout.mockReset();
  });

  it("calls deleteWorkout with the workout id when clicked (no confirm step)", async () => {
    mockedDeleteWorkout.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DeleteWorkoutButton id="workout-123" />);

    await user.click(screen.getByRole("button", { name: "Delete workout" }));

    await waitFor(() => expect(mockedDeleteWorkout).toHaveBeenCalledWith("workout-123"));
  });

  it("surfaces a server error returned by the action", async () => {
    mockedDeleteWorkout.mockResolvedValue({
      success: false,
      error: "Couldn't delete the workout. Try again.",
    });
    const user = userEvent.setup();
    render(<DeleteWorkoutButton id="workout-123" />);

    await user.click(screen.getByRole("button", { name: "Delete workout" }));

    expect(await screen.findByText("Couldn't delete the workout. Try again.")).toBeInTheDocument();
  });
});
