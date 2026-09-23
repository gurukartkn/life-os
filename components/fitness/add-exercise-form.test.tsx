import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddExerciseForm } from "./add-exercise-form";
import { createExerciseWithTags } from "@/actions/exercises";
import { createMuscleGroupInline } from "@/actions/muscle-groups";
import { createEquipmentInline } from "@/actions/equipment";

vi.mock("@/actions/exercises", () => ({ createExerciseWithTags: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));

const mockedCreate = vi.mocked(createExerciseWithTags);
const mockedCreateMuscleGroup = vi.mocked(createMuscleGroupInline);
const mockedCreateEquipment = vi.mocked(createEquipmentInline);

const MUSCLE_GROUP_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const EQUIPMENT_ID = "5b6f3d40-2222-4a11-8b11-222222222222";
const NEW_MUSCLE_GROUP_ID = "5b6f3d40-3333-4a11-8b11-333333333333";

// The id-based schema requires real uuids, so the fixtures use them rather than "mg-1".
const MUSCLE_GROUPS = [{ id: MUSCLE_GROUP_ID, name: "Chest", isActive: true }];
const EQUIPMENT = [{ id: EQUIPMENT_ID, name: "Barbell", isActive: true }];

describe("AddExerciseForm", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedCreateMuscleGroup.mockReset();
    mockedCreateEquipment.mockReset();
  });

  it("submits the name, type and the picked tag ids, then resets on success", async () => {
    mockedCreate.mockResolvedValue({ success: true, data: { id: "ex-1" } });
    const user = userEvent.setup();
    render(<AddExerciseForm muscleGroups={MUSCLE_GROUPS} equipment={EQUIPMENT} />);

    const nameInput = screen.getByLabelText("Exercise name");
    await user.type(nameInput, "Bench Press");
    await user.selectOptions(screen.getByLabelText("Exercise type"), "cardio");
    await user.click(screen.getByRole("button", { name: "Chest" }));
    await user.click(screen.getByRole("button", { name: "Barbell" }));
    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        name: "Bench Press",
        exerciseType: "cardio",
        muscleGroupIds: [MUSCLE_GROUP_ID],
        equipmentIds: [EQUIPMENT_ID],
      })
    );
    await waitFor(() => expect(nameInput).toHaveValue(""));
  });

  it("shows a client-side error and does not submit when the name is empty", async () => {
    const user = userEvent.setup();
    render(<AddExerciseForm muscleGroups={[]} equipment={[]} />);

    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreate.mockResolvedValue({ success: false, error: "Couldn't add the exercise. Try again." });
    const user = userEvent.setup();
    render(<AddExerciseForm muscleGroups={[]} equipment={[]} />);

    await user.type(screen.getByLabelText("Exercise name"), "Bench Press");
    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    expect(await screen.findByText("Couldn't add the exercise. Try again.")).toBeInTheDocument();
  });

  it("creates a muscle group inline and selects it immediately", async () => {
    mockedCreateMuscleGroup.mockResolvedValue({
      success: true,
      data: { id: NEW_MUSCLE_GROUP_ID, name: "Triceps", isActive: true },
    });
    mockedCreate.mockResolvedValue({ success: true, data: { id: "ex-1" } });
    const user = userEvent.setup();
    render(<AddExerciseForm muscleGroups={MUSCLE_GROUPS} equipment={[]} />);

    await user.type(screen.getByLabelText("New muscle groups"), "Triceps");
    await user.click(screen.getByLabelText("Add muscle groups"));

    expect(await screen.findByRole("button", { name: "Triceps" })).toHaveAttribute("aria-pressed", "true");
    expect(mockedCreateMuscleGroup).toHaveBeenCalledWith({ name: "Triceps" });

    await user.type(screen.getByLabelText("Exercise name"), "Bench Press");
    await user.click(screen.getByRole("button", { name: /add exercise/i }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ muscleGroupIds: [NEW_MUSCLE_GROUP_ID] })
      )
    );
  });
});
