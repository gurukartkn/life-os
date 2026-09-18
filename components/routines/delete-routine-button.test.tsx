import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteRoutineButton } from "./delete-routine-button";
import { deleteRoutine } from "@/actions/routines";

vi.mock("@/actions/routines", () => ({
  deleteRoutine: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockedDelete = vi.mocked(deleteRoutine);
const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("DeleteRoutineButton", () => {
  beforeEach(() => {
    mockedDelete.mockReset();
    mockPush.mockReset();
  });

  it("calls deleteRoutine with the routine id when clicked, with no confirm step", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DeleteRoutineButton id={ROUTINE_ID} />);

    await user.click(screen.getByRole("button", { name: "Delete routine" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(ROUTINE_ID));
  });

  it("redirects to redirectTo after a successful delete", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DeleteRoutineButton id={ROUTINE_ID} redirectTo="/routines" />);

    await user.click(screen.getByRole("button", { name: "Delete routine" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/routines"));
  });

  it("does not redirect when there is no redirectTo prop", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DeleteRoutineButton id={ROUTINE_ID} />);

    await user.click(screen.getByRole("button", { name: "Delete routine" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a server error and does not redirect on failure", async () => {
    mockedDelete.mockResolvedValue({
      success: false,
      error: "Couldn't delete the routine. Try again.",
    });
    const user = userEvent.setup();
    render(<DeleteRoutineButton id={ROUTINE_ID} redirectTo="/routines" />);

    await user.click(screen.getByRole("button", { name: "Delete routine" }));

    expect(
      await screen.findByText("Couldn't delete the routine. Try again.")
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
