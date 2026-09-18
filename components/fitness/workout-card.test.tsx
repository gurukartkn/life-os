import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkoutCard } from "./workout-card";
import { formatRelative } from "@/lib/dates";

describe("WorkoutCard", () => {
  it("renders the name, exercise count, and muscle group tags", () => {
    render(
      <WorkoutCard
        id="w-1"
        name="Push Day"
        exerciseCount={3}
        muscleGroups={["Chest", "Triceps"]}
        lastLogged={null}
      />
    );

    expect(screen.getByText("Push Day")).toBeInTheDocument();
    expect(screen.getByText("3 exercises")).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Triceps")).toBeInTheDocument();
  });

  it("uses singular 'exercise' when exerciseCount is 1", () => {
    render(
      <WorkoutCard id="w-1" name="Push Day" exerciseCount={1} muscleGroups={[]} lastLogged={null} />
    );

    expect(screen.getByText("1 exercise")).toBeInTheDocument();
  });

  it("shows 'Not logged yet' when lastLogged is null", () => {
    render(
      <WorkoutCard id="w-1" name="Push Day" exerciseCount={3} muscleGroups={[]} lastLogged={null} />
    );

    expect(screen.getByText("Not logged yet")).toBeInTheDocument();
  });

  it("shows 'Last logged ...' when lastLogged is set", () => {
    const lastLogged = "2024-01-01T00:00:00Z";
    render(
      <WorkoutCard
        id="w-1"
        name="Push Day"
        exerciseCount={3}
        muscleGroups={[]}
        lastLogged={lastLogged}
      />
    );

    expect(screen.getByText(`Last logged ${formatRelative(lastLogged)}`)).toBeInTheDocument();
  });

  it("renders a form posting to startWorkoutLog with a hidden workout_id input", () => {
    const { container } = render(
      <WorkoutCard id="workout-42" name="Push Day" exerciseCount={3} muscleGroups={[]} lastLogged={null} />
    );

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    const hiddenInput = container.querySelector('input[name="workout_id"]') as HTMLInputElement | null;
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput?.value).toBe("workout-42");
    expect(hiddenInput?.type).toBe("hidden");
  });
});
