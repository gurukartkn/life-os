import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateRoutineForm } from "./create-routine-form";
import { createRoutine } from "@/actions/routines";

vi.mock("@/actions/routines", () => ({
  createRoutine: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockedCreateRoutine = vi.mocked(createRoutine);

describe("CreateRoutineForm", () => {
  beforeEach(() => {
    mockedCreateRoutine.mockReset();
    mockPush.mockReset();
  });

  it("adds and removes item rows", async () => {
    const user = userEvent.setup();
    render(<CreateRoutineForm />);

    expect(screen.getByLabelText("Item 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add item/i }));
    expect(screen.getByLabelText("Item 2")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Remove item" })[1]);
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();
  });

  it("disables removing the last remaining item row", () => {
    render(<CreateRoutineForm />);
    expect(screen.getByRole("button", { name: "Remove item" })).toBeDisabled();
  });

  it("submits title, cadence, and items to createRoutine", async () => {
    mockedCreateRoutine.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<CreateRoutineForm />);

    await user.type(screen.getByLabelText("Title"), "Morning routine");
    await user.selectOptions(screen.getByLabelText("Cadence"), "weekly");
    await user.type(screen.getByLabelText("Item 1"), "Stretch");
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    await waitFor(() =>
      expect(mockedCreateRoutine).toHaveBeenCalledWith({
        title: "Morning routine",
        cadence: "weekly",
        items: [{ title: "Stretch" }],
      })
    );
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreateRoutine.mockResolvedValue({
      success: false,
      error: "Couldn't create the routine. Try again.",
    });
    const user = userEvent.setup();
    render(<CreateRoutineForm />);

    await user.type(screen.getByLabelText("Title"), "Morning routine");
    await user.type(screen.getByLabelText("Item 1"), "Stretch");
    await user.click(screen.getByRole("button", { name: /create routine/i }));

    expect(
      await screen.findByText("Couldn't create the routine. Try again.")
    ).toBeInTheDocument();
  });
});
