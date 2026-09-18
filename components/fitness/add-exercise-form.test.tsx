import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddExerciseForm } from "./add-exercise-form";
import { createExercise } from "@/actions/exercises";

vi.mock("@/actions/exercises", () => ({
  createExercise: vi.fn(),
}));

const mockedCreateExercise = vi.mocked(createExercise);

describe("AddExerciseForm", () => {
  beforeEach(() => {
    mockedCreateExercise.mockReset();
  });

  it("submits the name, type, and tags then resets on success", async () => {
    mockedCreateExercise.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddExerciseForm />);

    const nameInput = screen.getByLabelText("Exercise name");
    await user.type(nameInput, "Bench Press");
    await user.selectOptions(screen.getByLabelText("Exercise type"), "cardio");
    await user.type(screen.getByLabelText("Muscle groups"), "Chest, Triceps");
    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    await waitFor(() => expect(mockedCreateExercise).toHaveBeenCalled());
    const formData = mockedCreateExercise.mock.calls[0][1];
    expect(formData.get("name")).toBe("Bench Press");
    expect(formData.get("exercise_type")).toBe("cardio");
    expect(formData.get("muscle_groups")).toBe("Chest, Triceps");

    await waitFor(() => expect(nameInput).toHaveValue(""));
  });

  it("shows a client-side error and does not submit when the name is empty", async () => {
    const user = userEvent.setup();
    render(<AddExerciseForm />);

    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(mockedCreateExercise).not.toHaveBeenCalled();
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreateExercise.mockResolvedValue({
      success: false,
      error: "Couldn't add the exercise. Try again.",
    });
    const user = userEvent.setup();
    render(<AddExerciseForm />);

    await user.type(screen.getByLabelText("Exercise name"), "Bench Press");
    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    expect(await screen.findByText("Couldn't add the exercise. Try again.")).toBeInTheDocument();
  });
});
