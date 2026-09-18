import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkoutList, type WorkoutCardData } from "./workout-list";

const WORKOUTS: WorkoutCardData[] = [
  { id: "w-1", name: "Push Day", exerciseCount: 3, muscleGroups: ["Chest"], lastLogged: null },
  { id: "w-2", name: "Pull Day", exerciseCount: 4, muscleGroups: ["Back"], lastLogged: null },
  { id: "w-3", name: "Leg Day", exerciseCount: 5, muscleGroups: ["Legs"], lastLogged: null },
];

describe("WorkoutList", () => {
  it("renders one card per workout in the workouts prop", () => {
    render(<WorkoutList workouts={WORKOUTS} />);

    for (const workout of WORKOUTS) {
      expect(screen.getByText(workout.name)).toBeInTheDocument();
    }
  });

  it("renders nothing extra when workouts is empty", () => {
    const { container } = render(<WorkoutList workouts={[]} />);
    expect(container.querySelectorAll("form")).toHaveLength(0);
  });
});
