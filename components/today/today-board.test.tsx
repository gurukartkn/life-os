import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TODAY_SECTIONS, TodayBoard, type TodayData } from "./today-board";

const TODAY = "2026-09-28";

function emptyData(error = false): TodayData {
  return {
    today: TODAY,
    timeZone: "Asia/Kolkata",
    tasks: { tasks: [], total: 0, error },
    routines: {
      data: {
        today: TODAY,
        groups: [],
        notDue: [],
        notScheduled: [],
        dueCount: 0,
        doneCount: 0,
        archived: [],
        hasRoutines: false,
      },
      error,
    },
    fitness: { sessions: [], error },
    goals: { goals: [], error },
    spending: { spending: null, error },
  };
}

const HEADINGS = ["Tasks", "Routines", "Fitness", "Goals", "Spending this month"];

describe("TodayBoard", () => {
  it("lists every module once", () => {
    expect(TODAY_SECTIONS.map((section) => section.id)).toEqual(["tasks", "routines", "fitness", "goals", "spending"]);
  });

  it("renders all five sections, each with its empty state, when there is no data", () => {
    render(<TodayBoard data={emptyData()} />);

    for (const name of HEADINGS) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(within(screen.getByRole("region", { name: "Tasks" })).getByText("Nothing due today.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Routines" })).getByText("No routines yet.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Fitness" })).getByText("No workout logged today.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Goals" })).getByText("No active goals.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Spending this month" })).getByText("No spending tracked yet.")
    ).toBeInTheDocument();
  });

  it("keeps every section on the page when its read failed", () => {
    render(<TodayBoard data={emptyData(true)} />);

    for (const name of HEADINGS) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("alert")).toHaveLength(HEADINGS.length);
  });

  it("tags overdue tasks and counts the ones past the cap", () => {
    const data = emptyData();
    data.tasks = {
      tasks: [
        { id: "a", title: "File taxes", dueDate: "2026-09-20" },
        { id: "b", title: "Call bank", dueDate: TODAY },
      ],
      total: 7,
      error: false,
    };
    render(<TodayBoard data={data} />);

    const card = screen.getByRole("region", { name: "Tasks" });
    expect(within(card).getByRole("link", { name: /File taxes/ })).toHaveTextContent("Overdue · Sun 20 Sep");
    expect(within(card).getByRole("link", { name: /Call bank/ })).toHaveTextContent("Today");
    expect(within(card).getByText("+5 more")).toBeInTheDocument();
  });

  it("shows each routine due today with its progress, and today's workouts", () => {
    const data = emptyData();
    const item = (id: string, checked: boolean) => ({ id, title: id, checked, detail: "", doneAt: null, notDueLabel: null });
    data.routines.data = {
      ...data.routines.data,
      hasRoutines: true,
      dueCount: 3,
      doneCount: 2,
      groups: [
        {
          timeOfDay: "morning",
          label: "Morning",
          routines: [
            { id: "r1", title: "Stretch", frequencyLabel: "Daily", weekProgress: null, items: [item("a", true), item("b", true)] },
            { id: "r2", title: "Journal", frequencyLabel: "Daily", weekProgress: null, items: [item("c", false)] },
          ],
        },
      ],
    };
    data.fitness.sessions = [
      { id: "log-1", workoutName: "Push day", performedAt: "2026-09-28T02:30:00Z", minutes: 45, setCount: 12 },
    ];
    render(<TodayBoard data={data} />);

    const routines = screen.getByRole("region", { name: "Routines" });
    expect(within(routines).getByText("2 of 3 done")).toBeInTheDocument();
    expect(within(routines).getByRole("link", { name: /Stretch/ })).toHaveTextContent("2 of 2");
    expect(within(routines).getByRole("link", { name: /Journal/ })).toHaveTextContent("0 of 1");

    const fitness = screen.getByRole("region", { name: "Fitness" });
    const session = within(fitness).getByRole("link", { name: /Push day/ });
    expect(session).toHaveAttribute("href", "/fitness/logs/log-1");
    expect(session).toHaveTextContent("8:00 am");
  });
});
