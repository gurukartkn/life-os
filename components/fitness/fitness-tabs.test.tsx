import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FitnessTabs } from "./fitness-tabs";

describe("FitnessTabs", () => {
  it("renders Workouts and Exercises tab links with correct hrefs", () => {
    render(<FitnessTabs active="workouts" />);

    expect(screen.getByRole("tab", { name: "Workouts" })).toHaveAttribute("href", "/fitness");
    expect(screen.getByRole("tab", { name: "Exercises" })).toHaveAttribute(
      "href",
      "/fitness?tab=exercises"
    );
  });

  it("marks the Workouts tab active and Exercises tab inactive when active='workouts'", () => {
    render(<FitnessTabs active="workouts" />);

    const workoutsTab = screen.getByRole("tab", { name: "Workouts" });
    const exercisesTab = screen.getByRole("tab", { name: "Exercises" });

    expect(workoutsTab).toHaveAttribute("aria-selected", "true");
    expect(workoutsTab.className).toContain("border-teal");
    expect(exercisesTab).toHaveAttribute("aria-selected", "false");
    expect(exercisesTab.className).toContain("border-transparent");
  });

  it("marks the Exercises tab active and Workouts tab inactive when active='exercises'", () => {
    render(<FitnessTabs active="exercises" />);

    const workoutsTab = screen.getByRole("tab", { name: "Workouts" });
    const exercisesTab = screen.getByRole("tab", { name: "Exercises" });

    expect(exercisesTab).toHaveAttribute("aria-selected", "true");
    expect(exercisesTab.className).toContain("border-teal");
    expect(workoutsTab).toHaveAttribute("aria-selected", "false");
    expect(workoutsTab.className).toContain("border-transparent");
  });
});
