import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoutineList, type RoutineCardData } from "./routine-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RoutineList", () => {
  it("renders one card per routine in the list", () => {
    const routines: RoutineCardData[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "Morning routine",
        cadence: "daily",
        totalCount: 3,
        doneCount: 1,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        title: "Evening routine",
        cadence: "weekly",
        totalCount: 2,
        doneCount: 2,
      },
    ];

    render(<RoutineList routines={routines} />);

    expect(screen.getByText("Morning routine")).toBeInTheDocument();
    expect(screen.getByText("Evening routine")).toBeInTheDocument();
  });

  it("renders nothing when there are no routines", () => {
    render(<RoutineList routines={[]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
