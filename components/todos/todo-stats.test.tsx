import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TodoStats } from "./todo-stats";

describe("TodoStats", () => {
  it("renders each count under its label", () => {
    render(<TodoStats dueToday={3} overdue={1} completed={7} />);

    const dueTodayCard = screen.getByText("Due today").closest("div");
    const overdueCard = screen.getByText("Overdue").closest("div");
    const completedCard = screen.getByText("Completed").closest("div");

    expect(within(dueTodayCard!).getByText("3")).toBeInTheDocument();
    expect(within(overdueCard!).getByText("1")).toBeInTheDocument();
    expect(within(completedCard!).getByText("7")).toBeInTheDocument();
  });
});
