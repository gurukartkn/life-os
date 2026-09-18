import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveRoutineItemButton } from "./archive-routine-item-button";
import { archiveRoutineItem } from "@/actions/routines";

vi.mock("@/actions/routines", () => ({
  archiveRoutineItem: vi.fn(),
}));

const mockedArchive = vi.mocked(archiveRoutineItem);
const ITEM_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440001";

describe("ArchiveRoutineItemButton", () => {
  beforeEach(() => {
    mockedArchive.mockReset();
  });

  it("calls archiveRoutineItem with the item and routine ids when clicked", async () => {
    mockedArchive.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ArchiveRoutineItemButton id={ITEM_ID} routineId={ROUTINE_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove item" }));

    await waitFor(() => expect(mockedArchive).toHaveBeenCalledWith(ITEM_ID, ROUTINE_ID));
  });

  it("shows a server error returned by the action", async () => {
    mockedArchive.mockResolvedValue({
      success: false,
      error: "Couldn't remove the item. Try again.",
    });
    const user = userEvent.setup();
    render(<ArchiveRoutineItemButton id={ITEM_ID} routineId={ROUTINE_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove item" }));

    expect(
      await screen.findByText("Couldn't remove the item. Try again.")
    ).toBeInTheDocument();
  });
});
