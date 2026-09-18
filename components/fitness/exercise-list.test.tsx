import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExerciseList } from "./exercise-list";
import type { Tables } from "@/lib/types/database";

const EXERCISES: Tables<"exercises">[] = [
  {
    id: "ex-1",
    name: "Bench Press",
    exercise_type: "weight_training",
    muscle_groups: ["Chest"],
    equipment: [],
    is_active: true,
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "ex-2",
    name: "Treadmill Run",
    exercise_type: "cardio",
    muscle_groups: [],
    equipment: [],
    is_active: false,
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("ExerciseList", () => {
  it("renders exercise names and type labels from the exercises prop", () => {
    render(<ExerciseList exercises={EXERCISES} />);

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Weight training")).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();

    expect(screen.getByText("Treadmill Run")).toBeInTheDocument();
    expect(screen.getByText("Cardio")).toBeInTheDocument();
  });

  it("shows an 'Archived' tag for inactive exercises only", () => {
    render(<ExerciseList exercises={EXERCISES} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getAllByText("Archived")).toHaveLength(1);
  });

  it("only renders the archive button for active exercises", () => {
    render(<ExerciseList exercises={EXERCISES} />);

    expect(screen.getAllByLabelText("Archive exercise")).toHaveLength(1);
  });
});
