import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutinesToday } from "./routines-today";
import { setRoutineActive, toggleRoutineItem } from "@/actions/routines";
import type { RoutinesToday as Data, TodayItem } from "@/lib/queries/routines";

vi.mock("@/actions/routines", () => ({ toggleRoutineItem: vi.fn(), setRoutineActive: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const mockedToggle = vi.mocked(toggleRoutineItem);
const mockedSetActive = vi.mocked(setRoutineActive);
const TODAY = "2026-09-23";

function item(id: string, title: string, overrides: Partial<TodayItem> = {}): TodayItem {
  return { id, title, checked: false, detail: "every time", doneAt: null, notDueLabel: null, ...overrides };
}

function data(overrides: Partial<Data> = {}): Data {
  return {
    today: TODAY,
    groups: [
      {
        timeOfDay: "evening",
        label: "Evening",
        routines: [
          {
            id: "r-skin",
            title: "Skincare",
            frequencyLabel: "Daily",
            weekProgress: null,
            items: [item("c", "Cleanser", { checked: true, doneAt: "Done 7:10 pm" }), item("e", "Exfoliate")],
          },
        ],
      },
      {
        timeOfDay: "anytime",
        label: "Anytime",
        routines: [
          {
            id: "r-stretch",
            title: "Stretching",
            frequencyLabel: "3 times a week",
            weekProgress: "2 of 3 this week",
            items: [item("h", "Hip flexor stretch")],
          },
        ],
      },
    ],
    notDue: [
      {
        id: "r-skin",
        title: "Skincare",
        frequencyLabel: "Daily",
        weekProgress: null,
        items: [item("m", "Face mask", { notDueLabel: "due Saturday" })],
      },
    ],
    notScheduled: [{ id: "r-bike", title: "Bike maintenance", label: "next Sunday" }],
    dueCount: 3,
    doneCount: 1,
    archived: [],
    hasRoutines: true,
    ...overrides,
  };
}

beforeEach(() => {
  mockedToggle.mockReset();
  mockedSetActive.mockReset();
});

describe("RoutinesToday", () => {
  it("shows the day's percentage, routines grouped by time of day, and done times", () => {
    render(<RoutinesToday data={data()} />);

    expect(screen.getByRole("group", { name: "Today's progress" })).toHaveTextContent("33%");
    expect(screen.getByText(/1 of 3 due items done/)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Evening", "Anytime"]);
    const skincare = screen.getByRole("region", { name: "Skincare" });
    expect(within(skincare).getByText("1 of 2 today")).toBeInTheDocument();
    expect(within(skincare).getByText("Done 7:10 pm")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 this week")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bike maintenance" }).parentElement).toHaveTextContent(
      "Bike maintenance · next Sunday"
    );
  });

  it("checks an item for today with one tap, and rolls back if saving fails", async () => {
    mockedToggle.mockResolvedValue({ success: false, error: "Couldn't update the item. Try again." });
    const user = userEvent.setup();
    render(<RoutinesToday data={data()} />);

    const box = screen.getByRole("checkbox", { name: "Check Exfoliate" });
    await user.click(box);

    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith("e", TODAY, true));
    expect(await screen.findByText("Couldn't update the item. Try again.")).toBeInTheDocument();
    expect(box).not.toBeChecked();
  });

  it("keeps Not due today folded away until opened, and lets items be checked early", async () => {
    mockedToggle.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RoutinesToday data={data()} />);

    expect(screen.queryByText("Face mask")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Not due today/ }));
    expect(screen.getByText("due Saturday")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Check Face mask early" }));
    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith("m", TODAY, true));
  });

  it("turns the bar teal and drops the incomplete note at 100%", () => {
    render(<RoutinesToday data={data({ dueCount: 2, doneCount: 2 })} />);

    expect(screen.getByRole("group", { name: "Today's progress" })).toHaveTextContent("100%");
    expect(screen.getByText(/^2 of 2 due items done\. Items not due today are left out of the percentage\.$/)).toBeInTheDocument();
    expect(document.querySelector(".bg-teal")).not.toBeNull();
  });

  it("shows no percentage when nothing is due", () => {
    render(<RoutinesToday data={data({ groups: [], notDue: [], dueCount: 0, doneCount: 0 })} />);

    expect(screen.getByText("Nothing due today.")).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("restores an archived routine", async () => {
    mockedSetActive.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RoutinesToday data={data({ archived: [{ id: "r-old", title: "Old routine" }] })} />);

    await user.click(screen.getByRole("button", { name: /Archived routines/ }));
    await user.click(screen.getByRole("button", { name: "Restore Old routine" }));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledWith("r-old", true));
  });

  it("shows the empty and load-failed states", () => {
    const { unmount } = render(<RoutinesToday data={data({ hasRoutines: false, groups: [] })} />);
    expect(screen.getByText("No routines yet")).toBeInTheDocument();
    unmount();

    render(<RoutinesToday data={data()} loadError />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load routines");
  });
});
