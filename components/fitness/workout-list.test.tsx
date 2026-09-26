import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WorkoutList } from "./workout-list";

vi.mock("@/actions/workout-logs", () => ({ startWorkoutLog: vi.fn() }));

describe("WorkoutList", () => {
  it("shows each workout's size, muscle groups, last session, Start and Edit", () => {
    render(
      <WorkoutList
        workouts={[
          { id: "w1", name: "Legs", exerciseCount: 1, muscleGroups: [], lastDone: new Date(Date.now() - 2 * 86_400_000).toISOString() },
        ]}
      />
    );

    const row = screen.getByText("Legs").closest('[data-slot="workout-row"]') as HTMLElement;
    expect(within(row).getByText("1 exercise")).toBeInTheDocument();
    expect(within(row).getByText("Last done 2 days ago")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Start Legs" })).toHaveAttribute("type", "submit");
    expect(within(row).getByRole("link", { name: "Edit Legs" })).toHaveAttribute("href", "/fitness/workouts/w1/edit");
  });
});
