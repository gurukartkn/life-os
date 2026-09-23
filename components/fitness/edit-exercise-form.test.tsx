import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditExerciseForm } from "./edit-exercise-form";
import { updateExercise } from "@/actions/exercises";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

vi.mock("@/actions/exercises", () => ({ updateExercise: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));

const mockedUpdate = vi.mocked(updateExercise);

const EXERCISE_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const MG_ID = "5b6f3d40-2222-4a11-8b11-222222222222";

const EXERCISE: ExerciseWithTags = {
  id: EXERCISE_ID,
  name: "Bench Press",
  exerciseType: "weight_training",
  isActive: true,
  muscleGroups: [{ id: MG_ID, name: "Chest", isActive: true }],
  equipment: [],
};

describe("EditExerciseForm", () => {
  beforeEach(() => mockedUpdate.mockReset());

  it("prefills the name, type and current tags", () => {
    render(<EditExerciseForm exercise={EXERCISE} muscleGroups={[]} equipment={[]} onDone={vi.fn()} />);

    expect(screen.getByLabelText("Exercise name")).toHaveValue("Bench Press");
    expect(screen.getByRole("button", { name: "Chest" })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits the id, name, type and tag ids, then calls onDone", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EditExerciseForm exercise={EXERCISE} muscleGroups={[]} equipment={[]} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith({
        id: EXERCISE_ID,
        name: "Bench Press",
        exerciseType: "weight_training",
        muscleGroupIds: [MG_ID],
        equipmentIds: [],
      })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("cancels without saving", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EditExerciseForm exercise={EXERCISE} muscleGroups={[]} equipment={[]} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDone).toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("surfaces a server error and does not call onDone", async () => {
    mockedUpdate.mockResolvedValue({ success: false, error: "That exercise no longer exists." });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EditExerciseForm exercise={EXERCISE} muscleGroups={[]} equipment={[]} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("That exercise no longer exists.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
