import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutineItemRow } from "./routine-item-row";
import { archiveRoutineItem, toggleRoutineItem } from "@/actions/routines";

vi.mock("@/actions/routines", () => ({
  toggleRoutineItem: vi.fn(),
  archiveRoutineItem: vi.fn(),
}));

const mockedToggle = vi.mocked(toggleRoutineItem);
const mockedArchive = vi.mocked(archiveRoutineItem);

const ITEM_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440001";
const PERIOD_START = "2026-09-18";

describe("RoutineItemRow", () => {
  beforeEach(() => {
    mockedToggle.mockReset();
    mockedArchive.mockReset();
  });

  it("calls toggleRoutineItem when the checkbox is checked", async () => {
    mockedToggle.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <RoutineItemRow
        id={ITEM_ID}
        title="Meditate"
        checked={false}
        periodStart={PERIOD_START}
        routineId={ROUTINE_ID}
      />
    );

    await user.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(mockedToggle).toHaveBeenCalledWith(ITEM_ID, PERIOD_START, true, ROUTINE_ID)
    );
  });

  it("calls archiveRoutineItem when the remove button is clicked", async () => {
    mockedArchive.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <RoutineItemRow
        id={ITEM_ID}
        title="Meditate"
        checked={false}
        periodStart={PERIOD_START}
        routineId={ROUTINE_ID}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove item" }));

    await waitFor(() => expect(mockedArchive).toHaveBeenCalledWith(ITEM_ID, ROUTINE_ID));
  });

  it("shows checked items with strikethrough styling", () => {
    render(
      <RoutineItemRow
        id={ITEM_ID}
        title="Meditate"
        checked={true}
        periodStart={PERIOD_START}
        routineId={ROUTINE_ID}
      />
    );
    expect(screen.getByText("Meditate")).toHaveClass("line-through");
  });
});
