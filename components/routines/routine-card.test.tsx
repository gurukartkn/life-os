import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoutineCard } from "./routine-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("RoutineCard", () => {
  it("renders the title, cadence tag, and progress info, and links to the routine", () => {
    render(
      <RoutineCard
        id={ROUTINE_ID}
        title="Morning routine"
        cadence="daily"
        totalCount={4}
        doneCount={3}
      />
    );

    expect(screen.getByText("Morning routine")).toBeInTheDocument();
    expect(screen.getByText("Daily")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 done")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view checklist/i })).toHaveAttribute(
      "href",
      `/routines/${ROUTINE_ID}`
    );
  });

  it("shows the weekly cadence tag and no-items state", () => {
    render(
      <RoutineCard
        id={ROUTINE_ID}
        title="Empty routine"
        cadence="weekly"
        totalCount={0}
        doneCount={0}
      />
    );

    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("No items yet")).toBeInTheDocument();
  });

  it("falls back to the raw cadence value when it isn't recognized", () => {
    render(
      <RoutineCard
        id={ROUTINE_ID}
        title="Custom routine"
        cadence="monthly"
        totalCount={1}
        doneCount={0}
      />
    );

    expect(screen.getByText("monthly")).toBeInTheDocument();
  });
});
