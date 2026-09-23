import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExerciseList } from "./exercise-list";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

const EXERCISES: ExerciseWithTags[] = [
  {
    id: "ex-1",
    name: "Bench Press",
    exerciseType: "weight_training",
    isActive: true,
    muscleGroups: [{ id: "mg-1", name: "Chest", isActive: true }],
    equipment: [{ id: "eq-1", name: "Barbell", isActive: true }],
  },
  {
    id: "ex-2",
    name: "Treadmill Run",
    exerciseType: "cardio",
    isActive: false,
    muscleGroups: [],
    equipment: [],
  },
];

describe("ExerciseList", () => {
  it("renders exercise names, type labels and tags from the exercises prop", () => {
    render(<ExerciseList exercises={EXERCISES} muscleGroups={[]} equipment={[]} />);

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Weight training")).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Barbell")).toBeInTheDocument();

    expect(screen.getByText("Treadmill Run")).toBeInTheDocument();
    expect(screen.getByText("Cardio")).toBeInTheDocument();
  });

  it("shows an 'Archived' tag for inactive exercises only", () => {
    render(<ExerciseList exercises={EXERCISES} muscleGroups={[]} equipment={[]} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getAllByText("Archived")).toHaveLength(1);
  });

  it("only renders the archive button for active exercises", () => {
    render(<ExerciseList exercises={EXERCISES} muscleGroups={[]} equipment={[]} />);

    expect(screen.getAllByLabelText("Archive exercise")).toHaveLength(1);
  });

  it("every exercise, including an archived one, offers an edit button", () => {
    render(<ExerciseList exercises={EXERCISES} muscleGroups={[]} equipment={[]} />);

    expect(screen.getAllByLabelText("Edit exercise")).toHaveLength(2);
  });
});
