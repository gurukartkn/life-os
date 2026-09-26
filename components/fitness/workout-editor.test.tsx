import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutEditor, type EditorItem } from "./workout-editor";
import { createWorkout, deleteWorkout, updateWorkout } from "@/actions/workouts";
import type { PickerExercise } from "@/lib/fitness/editor-data";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/actions/workouts", () => ({ createWorkout: vi.fn(), updateWorkout: vi.fn(), deleteWorkout: vi.fn() }));
vi.mock("@/actions/exercises", () => ({ createExerciseWithTags: vi.fn(), updateExercise: vi.fn(), archiveExercise: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));

const mockedCreate = vi.mocked(createWorkout);
const mockedUpdate = vi.mocked(updateWorkout);
const mockedDelete = vi.mocked(deleteWorkout);

const WORKOUT_ID = "5b6f3d40-1111-4a11-8b11-111111111111";
const BENCH = "5b6f3d40-2222-4a11-8b11-222222222222";
const PULL = "5b6f3d40-3333-4a11-8b11-333333333333";
const PLANK = "5b6f3d40-4444-4a11-8b11-444444444444";

const EXERCISES: PickerExercise[] = [
  { id: BENCH, name: "Bench press", exerciseType: "weight_training", muscleGroups: ["Chest"], isActive: true },
  { id: PULL, name: "Pull-up", exerciseType: "weight_training", muscleGroups: ["Back"], isActive: true },
  { id: PLANK, name: "Plank", exerciseType: "other", muscleGroups: ["Core"], isActive: true },
];

const ITEMS: EditorItem[] = [
  { key: "r1", id: "row-1", exerciseId: BENCH, targetSets: "3", targetReps: "8" },
  { key: "r2", id: "row-2", exerciseId: PULL, targetSets: "3", targetReps: "6" },
];

function renderEditor(workout: { id: string; name: string; notes: string | null } | null, items: EditorItem[] = ITEMS) {
  render(<WorkoutEditor workout={workout} initialItems={items} exercises={EXERCISES} muscleGroups={[]} equipment={[]} />);
}

const rowNames = () =>
  Array.from(document.querySelectorAll('[data-slot="workout-editor-row"]')).map(
    (row) => row.querySelector(".font-medium.text-ink")?.textContent
  );

beforeEach(() => {
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedDelete.mockReset();
  push.mockReset();
});

describe("WorkoutEditor", () => {
  it("reorders with the arrows, removes a row, and saves the new order with row ids", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderEditor({ id: WORKOUT_ID, name: "Upper body A", notes: "Keep" });

    expect(screen.getByRole("button", { name: "Move Bench press up" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move Bench press down" }));
    expect(rowNames()).toEqual(["Pull-up", "Bench press"]);

    const reps = screen.getByLabelText("Target reps for Bench press");
    await user.clear(reps);
    await user.type(reps, "10");
    await user.click(screen.getByRole("button", { name: "Save workout" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith({
        id: WORKOUT_ID,
        name: "Upper body A",
        notes: "Keep",
        items: [
          { id: "row-2", exerciseId: PULL, targetSets: 3, targetReps: "6" },
          { id: "row-1", exerciseId: BENCH, targetSets: 3, targetReps: "10" },
        ],
      })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/fitness/workouts"));
  });

  it("adds an exercise from the picker, marking those already added", async () => {
    const user = userEvent.setup();
    renderEditor({ id: WORKOUT_ID, name: "Upper body A", notes: null });

    await user.click(screen.getByRole("button", { name: "Add exercise" }));
    const pull = await screen.findByRole("checkbox", { name: /Pull-up/ });
    expect(pull).toBeChecked();
    expect(pull).toBeDisabled();
    expect(screen.getAllByText("Already added")).toHaveLength(2);

    await user.click(screen.getByRole("checkbox", { name: /Plank/ }));

    expect(rowNames()).toEqual(["Bench press", "Pull-up", "Plank"]);
    expect(screen.getByLabelText("Target sets for Plank")).toHaveValue("3");
  });

  it("opens the exercise form from New exercise…", async () => {
    const user = userEvent.setup();
    renderEditor({ id: WORKOUT_ID, name: "Upper body A", notes: null });

    await user.click(screen.getByRole("button", { name: "Add exercise" }));
    await user.click(await screen.findByRole("button", { name: "New exercise…" }));

    expect(within(await screen.findByRole("dialog")).getByRole("heading", { name: "New exercise" })).toBeInTheDocument();
  });

  it("creates a new workout from its name and rows", async () => {
    mockedCreate.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderEditor(null, [{ key: "n1", exerciseId: PLANK, targetSets: "2", targetReps: "" }]);

    expect(screen.getByRole("heading", { name: "New workout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete workout" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Workout name"), "Core");
    await user.click(screen.getByRole("button", { name: "Save workout" }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        name: "Core",
        notes: "",
        exercises: [{ exercise_id: PLANK, target_sets: 2, target_reps: undefined }],
      })
    );
  });

  it("checks the name, that there is an exercise, and the target sets before saving", async () => {
    const user = userEvent.setup();
    renderEditor(null, []);

    await user.click(screen.getByRole("button", { name: "Save workout" }));

    expect(screen.getByText("Enter a name.")).toBeInTheDocument();
    expect(screen.getByText("Add at least one exercise.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects target sets outside 1–20", async () => {
    const user = userEvent.setup();
    renderEditor({ id: WORKOUT_ID, name: "Upper body A", notes: null });

    const sets = screen.getByLabelText("Target sets for Bench press");
    await user.clear(sets);
    await user.type(sets, "25");
    await user.click(screen.getByRole("button", { name: "Save workout" }));

    expect(screen.getByText("Target sets must be a whole number from 1 to 20.")).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("deletes the workout from the footer", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderEditor({ id: WORKOUT_ID, name: "Upper body A", notes: null });

    await user.click(screen.getByRole("button", { name: "Delete workout" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(WORKOUT_ID));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/fitness/workouts"));
  });
});
