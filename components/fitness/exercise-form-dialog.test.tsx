import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { archiveExercise, createExerciseWithTags, updateExercise } from "@/actions/exercises";
import { createMuscleGroupInline } from "@/actions/muscle-groups";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

vi.mock("@/actions/exercises", () => ({ createExerciseWithTags: vi.fn(), updateExercise: vi.fn(), archiveExercise: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));

const mockedCreate = vi.mocked(createExerciseWithTags);
const mockedUpdate = vi.mocked(updateExercise);
const mockedArchive = vi.mocked(archiveExercise);
const mockedCreateGroup = vi.mocked(createMuscleGroupInline);

const EX_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const BACK = { id: "5b6f3d40-2222-4a11-8b11-222222222222", name: "Back", isActive: true };
const CABLE = { id: "5b6f3d40-3333-4a11-8b11-333333333333", name: "Cable machine", isActive: true };

function renderDialog(exercise: ExerciseWithTags | null = null) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(
    <ExerciseFormDialog
      open
      exercise={exercise}
      muscleGroups={[BACK]}
      equipment={[CABLE]}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  );
  return { onOpenChange, onSaved, dialog: screen.getByRole("dialog") };
}

beforeEach(() => {
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedArchive.mockReset();
  mockedCreateGroup.mockReset();
});

describe("ExerciseFormDialog", () => {
  it("creates an exercise with its type and tags, including one created inline", async () => {
    const LATS = { id: "5b6f3d40-4444-4a11-8b11-444444444444", name: "Lats", isActive: true };
    mockedCreateGroup.mockResolvedValue({ success: true, data: LATS });
    mockedCreate.mockResolvedValue({ success: true, data: { id: EX_ID } });
    const user = userEvent.setup();
    const { onSaved, onOpenChange, dialog } = renderDialog();

    expect(within(dialog).getByRole("heading", { name: "New exercise" })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Name"), "Cable row");
    expect(within(dialog).getByRole("button", { name: "Weight training" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dialog).getByRole("combobox", { name: "Muscle groups" }));
    await user.click(screen.getByRole("option", { name: "Back" }));
    await user.type(within(dialog).getByRole("combobox", { name: "Muscle groups" }), "Lats{Enter}");
    await waitFor(() => expect(within(dialog).getByText("Lats")).toBeInTheDocument());
    await user.click(within(dialog).getByRole("button", { name: "Save exercise" }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        name: "Cable row",
        exerciseType: "weight_training",
        muscleGroupIds: [BACK.id, LATS.id],
        equipmentIds: [],
      })
    );
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({
        id: EX_ID,
        name: "Cable row",
        exerciseType: "weight_training",
        muscleGroupNames: ["Back", "Lats"],
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("edits an exercise, starting from its values", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { dialog } = renderDialog({
      id: EX_ID,
      name: "Treadmill run",
      exerciseType: "cardio",
      isActive: true,
      muscleGroups: [BACK],
      equipment: [CABLE],
    });

    expect(within(dialog).getByRole("heading", { name: "Edit exercise" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Treadmill run");
    expect(within(dialog).getByRole("button", { name: "Cardio" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dialog).getByRole("button", { name: "Other" }));
    await user.click(within(dialog).getByRole("button", { name: "Save exercise" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith({
        id: EX_ID,
        name: "Treadmill run",
        exerciseType: "other",
        muscleGroupIds: [BACK.id],
        equipmentIds: [CABLE.id],
      })
    );
  });

  it("archives an exercise from the edit footer", async () => {
    mockedArchive.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog({
      id: EX_ID,
      name: "Plank",
      exerciseType: "other",
      isActive: true,
      muscleGroups: [],
      equipment: [],
    });

    await user.click(within(dialog).getByRole("button", { name: "Archive exercise" }));

    await waitFor(() => expect(mockedArchive).toHaveBeenCalledWith(EX_ID));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("requires a name and shows a server error without closing", async () => {
    mockedCreate.mockResolvedValue({ success: false, error: "Couldn't add the exercise. Try again." });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: "Save exercise" }));
    expect(await within(dialog).findByText("Enter a name.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Name"), "Plank");
    await user.click(within(dialog).getByRole("button", { name: "Save exercise" }));
    expect(await within(dialog).findByText("Couldn't add the exercise. Try again.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
