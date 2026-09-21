import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, subDays } from "date-fns";
import { TaskRow } from "./task-row";
import { deleteTask, toggleTask } from "@/actions/tasks";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/tasks", () => ({
  toggleTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const mockedToggle = vi.mocked(toggleTask);
const mockedDelete = vi.mocked(deleteTask);

function makeTask(overrides: Partial<Tables<"tasks">> = {}): Tables<"tasks"> {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "user-1",
    title: "Buy groceries",
    description: null,
    is_completed: false,
    completed_at: null,
    due_date: null,
    created_at: "2026-09-17T00:00:00.000Z",
    updated_at: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("TaskRow", () => {
  beforeEach(() => {
    mockedToggle.mockReset();
    mockedDelete.mockReset();
  });

  it("calls toggleTask when the checkbox is checked", async () => {
    mockedToggle.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<TaskRow task={makeTask()} />);

    await user.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(mockedToggle).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", true)
    );
  });

  it("calls deleteTask when the delete button is clicked", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<TaskRow task={makeTask()} />);

    await user.click(screen.getByRole("button", { name: "Delete task" }));

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000")
    );
  });

  it("shows an overdue due date in the pink status color", () => {
    render(<TaskRow task={makeTask({ due_date: "2020-01-01" })} />);
    expect(screen.getByText(/Due /)).toHaveClass("text-pink-ink");
  });

  it("shows an incomplete task due yesterday as overdue", () => {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    render(<TaskRow task={makeTask({ due_date: yesterday })} />);
    expect(screen.getByText(/Due /)).toHaveClass("text-pink-ink");
  });

  it("does not show a completed task due yesterday as overdue", () => {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    render(<TaskRow task={makeTask({ due_date: yesterday, is_completed: true })} />);
    expect(screen.getByText(/Due /)).not.toHaveClass("text-pink-ink");
  });

  it("does not show a task due today as overdue", () => {
    render(<TaskRow task={makeTask({ due_date: format(new Date(), "yyyy-MM-dd") })} />);
    expect(screen.getByText(/Due /)).not.toHaveClass("text-pink-ink");
  });

  it("shows completed tasks with strikethrough styling", () => {
    render(<TaskRow task={makeTask({ is_completed: true })} />);
    expect(screen.getByText("Buy groceries")).toHaveClass("line-through");
  });
});
