import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkGroup } from "./link-group";
import { setLinks, unlinkItem } from "@/actions/links";
import type { GoalItem, PickerItem } from "@/lib/queries/goals";

vi.mock("@/actions/links", () => ({ setLinks: vi.fn(), unlinkItem: vi.fn() }));

const mockedSetLinks = vi.mocked(setLinks);
const mockedUnlink = vi.mocked(unlinkItem);
const TODAY = "2026-09-26";

function item(type: GoalItem["type"], id: string, title: string, overrides: Partial<GoalItem> = {}): GoalItem {
  return { type, id, title, detail: null, dueDate: null, isCompleted: false, archived: false, ...overrides };
}

function offered(base: GoalItem, linked: boolean): PickerItem {
  return { ...base, linked };
}

const run = item("workout", "w1", "Run intervals", { detail: "Cardio, Legs" });
const treadmill = item("exercise", "e1", "Treadmill run", { detail: "Cardio · Legs" });
const rowing = item("exercise", "e2", "Rowing machine");
// Archived: linked, but not offered by the picker.
const oldBike = item("exercise", "e3", "Old bike", { archived: true });

function renderFitness() {
  return render(
    <LinkGroup
      goalId="g1"
      title="Fitness items"
      types={["workout", "exercise"]}
      linked={[run, treadmill, oldBike]}
      pickerItems={[offered(run, true), offered(treadmill, true), offered(rowing, false)]}
      today={TODAY}
      searchLabel="Search workouts and exercises"
    />
  );
}

beforeEach(() => {
  mockedSetLinks.mockReset().mockResolvedValue({ success: true });
  mockedUnlink.mockReset().mockResolvedValue({ success: true });
});

describe("LinkGroup", () => {
  it("lists linked items with their type, detail and an Archived tag", () => {
    renderFitness();

    const group = screen.getByRole("region", { name: "Fitness items" });
    expect(within(group).getByText("3 linked")).toBeInTheDocument();
    expect(within(group).getByText("Cardio, Legs")).toBeInTheDocument();
    expect(within(group).getByText("Archived")).toBeInTheDocument();
    expect(within(group).getAllByText("Exercise")).toHaveLength(2);
  });

  it("saves only the changed type on close, keeping linked items the picker doesn't offer", async () => {
    const user = userEvent.setup();
    renderFitness();

    await user.click(screen.getByRole("button", { name: "Link fitness items" }));
    // Each checkbox is named by its title alone, not the title plus the row's meta text.
    expect(await screen.findByRole("checkbox", { name: "Treadmill run" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Treadmill run" }));
    await user.click(screen.getByRole("checkbox", { name: "Rowing machine" }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(mockedSetLinks).toHaveBeenCalledTimes(1));
    const [goalId, type, ids] = mockedSetLinks.mock.calls[0];
    expect([goalId, type]).toEqual(["g1", "exercise"]);
    expect([...ids].sort()).toEqual(["e2", "e3"]);
  });

  it("writes nothing when the picker closes unchanged", async () => {
    const user = userEvent.setup();
    renderFitness();

    await user.click(screen.getByRole("button", { name: "Link fitness items" }));
    expect(await screen.findByText("Tick to link, untick to unlink.")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByText("Tick to link, untick to unlink.")).not.toBeInTheDocument());
    expect(mockedSetLinks).not.toHaveBeenCalled();
  });

  it("filters the picker by search", async () => {
    const user = userEvent.setup();
    renderFitness();

    await user.click(screen.getByRole("button", { name: "Link fitness items" }));
    await user.type(await screen.findByRole("searchbox"), "row");

    expect(screen.getByRole("checkbox", { name: "Rowing machine" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Run intervals" })).not.toBeInTheDocument();
  });

  it("unlinks one item from its row, and shows a failure", async () => {
    const user = userEvent.setup();
    mockedUnlink.mockResolvedValue({ success: false, error: "Couldn't unlink that. Try again." });
    renderFitness();

    await user.click(screen.getByRole("button", { name: "Unlink Treadmill run" }));

    expect(mockedUnlink).toHaveBeenCalledWith("g1", { type: "exercise", id: "e1" });
    expect(await screen.findByText("Couldn't unlink that. Try again.")).toBeInTheDocument();
  });

  it("labels linked tasks by due date, overdue ones in the attention colour", () => {
    render(
      <LinkGroup
        goalId="g1"
        title="Tasks"
        types={["task"]}
        linked={[
          item("task", "t1", "Order chain lube", { dueDate: "2026-09-21" }),
          item("task", "t2", "Plan Sunday ride", { dueDate: TODAY }),
          item("task", "t3", "Clean running shoes"),
        ]}
        pickerItems={[]}
        today={TODAY}
        searchLabel="Search tasks"
      />
    );

    expect(screen.getByText("Overdue")).toHaveClass("text-pink-ink");
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Undated")).toBeInTheDocument();
    expect(screen.queryByText("Task")).not.toBeInTheDocument();
  });
});
