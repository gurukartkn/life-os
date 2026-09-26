import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskView } from "./task-view";
import type { Tables } from "@/lib/types/database";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/actions/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
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

  it("shows every task with no status param, and tab counts", () => {
    render(<TaskView tasks={tasks} />);

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    const all = screen.getByRole("link", { name: /^All/ });
    expect(all).toHaveAttribute("aria-current", "true");
    expect(within(all).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^Active/ })).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /^Completed/ })).getByText("1")).toBeInTheDocument();
  });

  it("renders deep-linked ?status=active filtered on first render", () => {
    mockSearch = "status=active";
    render(<TaskView tasks={tasks} />);

    expect(screen.getByText("Open one")).toBeInTheDocument();
    expect(screen.queryByText("Done one")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Active/ })).toHaveAttribute("aria-current", "true");
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

    expect(screen.getByText("Nothing completed yet")).toBeInTheDocument();
  });

  it("shows the no-tasks empty state with its own Add task button", () => {
    render(<TaskView tasks={[]} />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Add a task and it will show up here.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add task" })).toHaveLength(2);
  });

  it("shows the load-failed state with a retry and no rows", () => {
    render(<TaskView tasks={[]} loadError />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load tasks");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
  });

  it("opens the add modal from the header, and the edit modal from a row", async () => {
    const user = userEvent.setup();
    render(<TaskView tasks={tasks} />);

    await user.click(screen.getByRole("button", { name: "Add task" }));
    const addDialog = await screen.findByRole("dialog");
    expect(within(addDialog).getByRole("heading", { name: "Add task" })).toBeInTheDocument();
    expect(within(addDialog).getByLabelText("Title")).toHaveValue("");

    await user.click(within(addDialog).getByRole("button", { name: "Cancel" }));
    await user.click(await screen.findByRole("button", { name: "Edit Open two" }));

    const editDialog = await screen.findByRole("dialog");
    expect(within(editDialog).getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    expect(within(editDialog).getByLabelText("Title")).toHaveValue("Open two");
  });
});
