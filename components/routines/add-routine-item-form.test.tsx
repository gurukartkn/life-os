import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddRoutineItemForm } from "./add-routine-item-form";
import { addRoutineItem } from "@/actions/routines";

vi.mock("@/actions/routines", () => ({
  addRoutineItem: vi.fn(),
}));

const mockedAddRoutineItem = vi.mocked(addRoutineItem);
const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("AddRoutineItemForm", () => {
  beforeEach(() => {
    mockedAddRoutineItem.mockReset();
  });

  it("submits the routine id and title then resets on success", async () => {
    mockedAddRoutineItem.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddRoutineItemForm routineId={ROUTINE_ID} />);

    const titleInput = screen.getByLabelText("Item title");
    await user.type(titleInput, "Stretch");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(mockedAddRoutineItem).toHaveBeenCalledWith({
        routine_id: ROUTINE_ID,
        title: "Stretch",
      })
    );
    await waitFor(() => expect(titleInput).toHaveValue(""));
  });

  it("shows a client-side error and does not submit when the title is empty", async () => {
    const user = userEvent.setup();
    render(<AddRoutineItemForm routineId={ROUTINE_ID} />);

    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(mockedAddRoutineItem).not.toHaveBeenCalled();
  });

  it("surfaces a server error returned by the action", async () => {
    mockedAddRoutineItem.mockResolvedValue({
      success: false,
      error: "Couldn't add the item. Try again.",
    });
    const user = userEvent.setup();
    render(<AddRoutineItemForm routineId={ROUTINE_ID} />);

    await user.type(screen.getByLabelText("Item title"), "Stretch");
    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(await screen.findByText("Couldn't add the item. Try again.")).toBeInTheDocument();
  });
});
