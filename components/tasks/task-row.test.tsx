import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, subDays } from "date-fns";
import { TaskRow } from "./task-row";
import { toggleTask } from "@/actions/tasks";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/tasks", () => ({ toggleTask: vi.fn() }));

const mockedToggle = vi.mocked(toggleTask);

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

const iso = (date: Date) => format(date, "yyyy-MM-dd");

describe("TaskRow", () => {
  beforeEach(() => {
    mockedToggle.mockReset();
  });

  it("calls toggleTask when the checkbox is checked", async () => {
    mockedToggle.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<TaskRow task={makeTask()} onEdit={vi.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: "Mark as done" }));

    await waitFor(() =>
      expect(mockedToggle).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", true)
    );
  });

  it("opens the edit modal for this task", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const task = makeTask();
    render(<TaskRow task={task} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "Edit Buy groceries" }));

    expect(onEdit).toHaveBeenCalledWith(task);
  });

  it("shows an open task due yesterday as an Overdue pill with its date", () => {
    const yesterday = subDays(new Date(), 1);
    render(<TaskRow task={makeTask({ due_date: iso(yesterday) })} onEdit={vi.fn()} />);

    const pill = screen.getByText(`Overdue · ${format(yesterday, "EEE d MMM")}`);
    expect(pill).toHaveClass("text-pink-ink");
  });

  it("does not show a completed task due yesterday as overdue", () => {
    const yesterday = subDays(new Date(), 1);
    render(<TaskRow task={makeTask({ due_date: iso(yesterday), is_completed: true })} onEdit={vi.fn()} />);

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    expect(screen.getByText(format(yesterday, "EEE d MMM"))).not.toHaveClass("text-pink-ink");
  });

  it("shows a task due today as a blue Today pill", () => {
    render(<TaskRow task={makeTask({ due_date: iso(new Date()) })} onEdit={vi.fn()} />);

    expect(screen.getByText("Today")).toHaveClass("text-blue-ink");
  });

  it("shows a later date as a neutral pill", () => {
    const later = addDays(new Date(), 5);
    render(<TaskRow task={makeTask({ due_date: iso(later) })} onEdit={vi.fn()} />);

    expect(screen.getByText(format(later, "EEE d MMM"))).toHaveClass("text-ink-muted");
  });

  it("shows no pill for an undated task", () => {
    const { container } = render(<TaskRow task={makeTask()} onEdit={vi.fn()} />);

    expect(container.querySelector('[data-slot="tag"]')).toBeNull();
  });

  it("offers Mark as not done on a completed task", () => {
    render(<TaskRow task={makeTask({ is_completed: true })} onEdit={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Mark as not done" })).toBeChecked();
  });

  it("surfaces a toggle failure on the row", async () => {
    mockedToggle.mockResolvedValue({ success: false, error: "Couldn't update the task. Try again." });
    const user = userEvent.setup();
    render(<TaskRow task={makeTask()} onEdit={vi.fn()} />);

    await user.click(screen.getByRole("checkbox"));

    expect(await screen.findByText("Couldn't update the task. Try again.")).toBeInTheDocument();
  });
});
