import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoutineChecklist, type RoutineItemData } from "./routine-checklist";

const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440000";
const PERIOD_START = "2026-09-18";

describe("RoutineChecklist", () => {
  it("shows done-of-total progress text and a matching progress bar width", () => {
    const items: RoutineItemData[] = [
      { id: "1", title: "Meditate", checked: true },
      { id: "2", title: "Stretch", checked: false },
      { id: "3", title: "Journal", checked: true },
      { id: "4", title: "Read", checked: false },
    ];

    const { container } = render(
      <RoutineChecklist items={items} periodStart={PERIOD_START} routineId={ROUTINE_ID} />
    );

    expect(screen.getByText("2 of 4 done")).toBeInTheDocument();
    const bar = container.querySelector(".bg-blue");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("shows full progress when every item is checked", () => {
    const items: RoutineItemData[] = [
      { id: "1", title: "Meditate", checked: true },
      { id: "2", title: "Stretch", checked: true },
    ];

    const { container } = render(
      <RoutineChecklist items={items} periodStart={PERIOD_START} routineId={ROUTINE_ID} />
    );

    expect(screen.getByText("2 of 2 done")).toBeInTheDocument();
    const bar = container.querySelector(".bg-blue");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("shows the empty state when there are no items", () => {
    const { container } = render(
      <RoutineChecklist items={[]} periodStart={PERIOD_START} routineId={ROUTINE_ID} />
    );

    expect(screen.getByText("Nothing on the list yet.")).toBeInTheDocument();
    expect(screen.getByText("No items yet")).toBeInTheDocument();
    const bar = container.querySelector(".bg-blue");
    expect(bar).toHaveStyle({ width: "0%" });
  });
});
