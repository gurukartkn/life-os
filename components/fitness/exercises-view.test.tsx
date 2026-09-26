import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExercisesView } from "./exercises-view";
import type { ExerciseWithTags } from "@/lib/queries/fitness";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/actions/exercises", () => ({ createExerciseWithTags: vi.fn(), updateExercise: vi.fn(), archiveExercise: vi.fn() }));
vi.mock("@/actions/muscle-groups", () => ({ createMuscleGroupInline: vi.fn() }));
vi.mock("@/actions/equipment", () => ({ createEquipmentInline: vi.fn() }));

const tag = (id: string, name: string) => ({ id, name, isActive: true });

const EXERCISES: ExerciseWithTags[] = [
  {
    id: "e1",
    name: "Bench press",
    exerciseType: "weight_training",
    isActive: true,
    muscleGroups: [tag("m1", "Chest"), tag("m2", "Triceps")],
    equipment: [tag("q1", "Barbell")],
  },
  { id: "e2", name: "Treadmill run", exerciseType: "cardio", isActive: true, muscleGroups: [tag("m3", "Legs")], equipment: [] },
  { id: "e3", name: "Old move", exerciseType: "other", isActive: false, muscleGroups: [], equipment: [] },
];

function renderView(exercises = EXERCISES, loadError = false) {
  render(<ExercisesView exercises={exercises} muscleGroups={[]} equipment={[]} loadError={loadError} />);
}

const rowNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

beforeEach(() => {
  mockSearch = "";
});

describe("ExercisesView", () => {
  it("lists each exercise with its type, muscle group and equipment pills", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Exercises" })).toBeInTheDocument();
    const bench = screen.getAllByRole("row").find((row) => row.textContent?.includes("Bench press"))!;
    expect(within(bench).getByText("Weight training")).toBeInTheDocument();
    expect(within(bench).getByText("Triceps")).toBeInTheDocument();
    expect(within(bench).getByText("Barbell")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("filters by the type and search in the URL", () => {
    mockSearch = "type=cardio";
    renderView();
    expect(rowNames()).toEqual(["Treadmill run"]);
    expect(screen.getByRole("button", { name: "Cardio" })).toHaveAttribute("aria-pressed", "true");
  });

  it("matches the search anywhere in the name, ignoring case", () => {
    mockSearch = "q=PRESS";
    renderView();
    expect(rowNames()).toEqual(["Bench press"]);
  });

  it("writes the filter to the URL in place", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Weight training" }));

    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/fitness/exercises?type=weight_training");
    replaceState.mockRestore();
  });

  it("opens the modal for a new exercise and for editing one", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "New exercise" }));
    expect(within(await screen.findByRole("dialog")).getByRole("heading", { name: "New exercise" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    await user.click(await screen.findByRole("button", { name: "Edit Treadmill run" }));
    expect(within(await screen.findByRole("dialog")).getByLabelText("Name")).toHaveValue("Treadmill run");
  });

  it("shows the empty state and the load-failed state", () => {
    renderView([]);
    expect(screen.getByText("No exercises yet")).toBeInTheDocument();
  });

  it("shows the load-failed state with a retry", () => {
    renderView([], true);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load exercises");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
