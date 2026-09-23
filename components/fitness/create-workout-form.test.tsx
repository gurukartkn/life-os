import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateWorkoutForm } from "./create-workout-form";
import { createWorkout } from "@/actions/workouts";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/workouts", () => ({
  createWorkout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockedCreateWorkout = vi.mocked(createWorkout);

const EXERCISE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const EXERCISES: Tables<"exercises">[] = [
  {
    id: EXERCISE_ID,
    name: "Bench Press",
    exercise_type: "weight_training",
    is_active: true,
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("CreateWorkoutForm", () => {
  beforeEach(() => {
    mockedCreateWorkout.mockReset();
  });

  it("shows a hint to add an exercise first when exercises is empty", () => {
    render(<CreateWorkoutForm exercises={[]} />);

    expect(
      screen.getByText("Add an exercise on the Exercises tab first, then come back to build a workout.")
    ).toBeInTheDocument();
  });

  it("adds and removes exercise rows via useFieldArray", async () => {
    const user = userEvent.setup();
    render(<CreateWorkoutForm exercises={EXERCISES} />);

    expect(screen.getByLabelText("Exercise 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Exercise 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove exercise" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    expect(screen.getByLabelText("Exercise 2")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove exercise" });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toBeEnabled();

    await user.click(removeButtons[1]);

    expect(screen.queryByLabelText("Exercise 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove exercise" })).toBeDisabled();
  });

  it("submits name, notes, and exercise rows with the right payload shape", async () => {
    mockedCreateWorkout.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<CreateWorkoutForm exercises={EXERCISES} />);

    await user.type(screen.getByLabelText("Name"), "Push Day");
    await user.selectOptions(screen.getByLabelText("Exercise 1"), EXERCISE_ID);

    const targetSets = screen.getByLabelText("Exercise 1 target sets");
    await user.clear(targetSets);
    await user.type(targetSets, "5");

    await user.type(screen.getByLabelText("Exercise 1 target reps"), "8-12");

    await user.click(screen.getByRole("button", { name: /create workout/i }));

    await waitFor(() =>
      expect(mockedCreateWorkout).toHaveBeenCalledWith({
        name: "Push Day",
        notes: "",
        exercises: [{ exercise_id: EXERCISE_ID, target_sets: 5, target_reps: "8-12" }],
      })
    );
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreateWorkout.mockResolvedValue({
      success: false,
      error: "Couldn't create the workout. Try again.",
    });
    const user = userEvent.setup();
    render(<CreateWorkoutForm exercises={EXERCISES} />);

    await user.type(screen.getByLabelText("Name"), "Push Day");
    await user.selectOptions(screen.getByLabelText("Exercise 1"), EXERCISE_ID);
    await user.click(screen.getByRole("button", { name: /create workout/i }));

    expect(await screen.findByText("Couldn't create the workout. Try again.")).toBeInTheDocument();
  });
});
