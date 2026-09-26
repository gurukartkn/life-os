import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutineForm, type RoutineFormItem, type RoutineFormRoutine } from "./routine-form";
import { createRoutine, setRoutineActive, updateRoutine } from "@/actions/routines";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/actions/routines", () => ({ createRoutine: vi.fn(), updateRoutine: vi.fn(), setRoutineActive: vi.fn() }));

const mockedCreate = vi.mocked(createRoutine);
const mockedUpdate = vi.mocked(updateRoutine);
const mockedSetActive = vi.mocked(setRoutineActive);

const ROUTINE: RoutineFormRoutine = {
  id: "r1",
  title: "Skincare",
  timeOfDay: "evening",
  frequency: "daily",
  timesPerWeek: null,
  weekdays: null,
};

const ITEMS: RoutineFormItem[] = [
  { key: "i1", id: "i1", title: "Cleanser", repeatRule: "every_time", repeatEvery: 2, isActive: true },
  { key: "i2", id: "i2", title: "Exfoliate", repeatRule: "every_nth", repeatEvery: 2, isActive: true },
  { key: "i3", id: "i3", title: "Toner", repeatRule: "every_time", repeatEvery: 2, isActive: false },
];

const itemNames = () => screen.getAllByLabelText("Item name").map((input) => (input as HTMLInputElement).value);

beforeEach(() => {
  mockedCreate.mockReset();
  mockedUpdate.mockReset();
  mockedSetActive.mockReset();
  push.mockReset();
});

describe("RoutineForm", () => {
  it("creates a routine with its schedule and items", async () => {
    mockedCreate.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<RoutineForm routine={null} initialItems={[]} />);

    expect(screen.getByRole("heading", { name: "New routine" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Stretching");
    await user.click(screen.getByRole("button", { name: "N times a week" }));
    await user.click(screen.getByRole("button", { name: "Increase times a week" }));
    expect(screen.getByText("Pick 1 to 6. Not tied to fixed days.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Item name"), "Hip flexor stretch");
    await user.click(screen.getByRole("button", { name: "Save routine" }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        title: "Stretching",
        timeOfDay: "anytime",
        frequency: "times_per_week",
        timesPerWeek: 4,
        weekdays: null,
        items: [{ id: undefined, title: "Hip flexor stretch", repeatRule: "every_time", repeatEvery: null, isActive: true }],
      })
    );
  });

  it("picks specific days, and explains that seven is Daily", async () => {
    const user = userEvent.setup();
    render(<RoutineForm routine={ROUTINE} initialItems={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Specific days" }));
    await user.click(screen.getByRole("button", { name: "Sun" }));

    expect(screen.getByRole("button", { name: "Sun" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Picking all seven days is the same as Daily.")).toBeInTheDocument();
  });

  it("words Every Nth by frequency and steps N", async () => {
    const user = userEvent.setup();
    render(<RoutineForm routine={ROUTINE} initialItems={ITEMS} />);

    expect(screen.getAllByRole("button", { name: "Every Nth day" })).toHaveLength(2);
    expect(screen.getByText("Every 2nd day")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Increase N for Exfoliate" }));
    expect(screen.getByText("Every 3rd day")).toBeInTheDocument();

    const cleanser = screen.getByRole("group", { name: "How often Cleanser repeats" });
    await user.click(within(cleanser).getByRole("button", { name: "Once a week" }));
    expect(screen.getByText("Once a week · due 7+ days after last done")).toBeInTheDocument();
  });

  it("reorders, archives, restores and removes items, then saves the whole list", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RoutineForm routine={ROUTINE} initialItems={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Move Exfoliate up" }));
    expect(itemNames()).toEqual(["Exfoliate", "Cleanser"]);

    await user.click(screen.getByRole("button", { name: "Archive Cleanser" }));
    await user.click(screen.getByRole("button", { name: /Archived \(2\)/ }));
    await user.click(screen.getByRole("button", { name: "Restore Toner" }));
    await user.click(screen.getByRole("button", { name: "Remove Exfoliate" }));
    expect(itemNames()).toEqual(["Toner"]);

    await user.click(screen.getByRole("button", { name: "Save routine" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith("r1", {
        title: "Skincare",
        timeOfDay: "evening",
        frequency: "daily",
        timesPerWeek: null,
        weekdays: null,
        items: [
          { id: "i3", title: "Toner", repeatRule: "every_time", repeatEvery: null, isActive: true },
          { id: "i1", title: "Cleanser", repeatRule: "every_time", repeatEvery: null, isActive: false },
        ],
      })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/routines"));
  });

  it("checks the form before saving", async () => {
    const user = userEvent.setup();
    render(<RoutineForm routine={null} initialItems={[]} />);

    await user.click(screen.getByRole("button", { name: "Save routine" }));
    expect(screen.getByText("Enter a name.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Bike");
    await user.click(screen.getByRole("button", { name: "Specific days" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));
    expect(screen.getByText("Pick at least one day.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("archives the whole routine from the footer", async () => {
    mockedSetActive.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RoutineForm routine={ROUTINE} initialItems={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Archive routine" }));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledWith("r1", false));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/routines"));
  });
});
