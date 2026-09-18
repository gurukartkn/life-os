import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseArchiveButton } from "./exercise-archive-button";
import { archiveExercise } from "@/actions/exercises";

vi.mock("@/actions/exercises", () => ({
  archiveExercise: vi.fn(),
}));

const mockedArchiveExercise = vi.mocked(archiveExercise);

describe("ExerciseArchiveButton", () => {
  beforeEach(() => {
    mockedArchiveExercise.mockReset();
  });

  it("calls archiveExercise with the exercise id when clicked", async () => {
    mockedArchiveExercise.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ExerciseArchiveButton id="exercise-123" />);

    await user.click(screen.getByRole("button", { name: "Archive exercise" }));

    await waitFor(() => expect(mockedArchiveExercise).toHaveBeenCalledWith("exercise-123"));
  });

  it("surfaces a server error returned by the action", async () => {
    mockedArchiveExercise.mockResolvedValue({
      success: false,
      error: "Couldn't archive the exercise. Try again.",
    });
    const user = userEvent.setup();
    render(<ExerciseArchiveButton id="exercise-123" />);

    await user.click(screen.getByRole("button", { name: "Archive exercise" }));

    expect(
      await screen.findByText("Couldn't archive the exercise. Try again.")
    ).toBeInTheDocument();
  });
});
