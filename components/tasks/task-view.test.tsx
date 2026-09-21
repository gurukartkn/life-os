import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskView } from "./task-view";
import type { Tables } from "@/lib/types/database";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
vi.mock("@/actions/tasks", () => ({
  toggleTask: vi.fn(),
  deleteTask: vi.fn(),
}));

function task(id: string, title: string, isCompleted: boolean): Tables<"tasks"> {
  return {
    id,
    user_id: "u1",
    title,
    description: null,
    due_date: null,
    is_completed: isCompleted,
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
}

const tasks = [task("1", "Open one", false), task("2", "Done one", true), task("3", "Open two", false)];

describe("TaskView", () => {
  beforeEach(() => {
    mockSearch = "";
  });

  it("shows every task with no status param", () => {
    render(<TaskView tasks={tasks} />);

    expect(screen.getByText("Open one")).toBeInTheDocument();
    expect(screen.getByText("Done one")).toBeInTheDocument();
    expect(screen.getByText("Open two")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "true");
  });

  it("renders deep-linked ?status=active filtered on first render", () => {
    mockSearch = "status=active";
    render(<TaskView tasks={tasks} />);

    expect(screen.getByText("Open one")).toBeInTheDocument();
    expect(screen.queryByText("Done one")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute("aria-current", "true");
  });

  it("renders deep-linked ?status=completed filtered on first render", () => {
    mockSearch = "status=completed";
    render(<TaskView tasks={tasks} />);

    expect(screen.getByText("Done one")).toBeInTheDocument();
    expect(screen.queryByText("Open one")).not.toBeInTheDocument();
  });

  it("treats an unknown status as all", () => {
    mockSearch = "status=bogus";
    render(<TaskView tasks={tasks} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("shows the filter-specific empty state when nothing matches", () => {
    mockSearch = "status=completed";
    render(<TaskView tasks={[task("1", "Open one", false)]} />);

    expect(screen.getByText("Nothing completed yet.")).toBeInTheDocument();
  });
});
