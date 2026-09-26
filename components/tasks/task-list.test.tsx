import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskList } from "./task-list";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/tasks", () => ({ toggleTask: vi.fn() }));

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

describe("TaskList", () => {
  it("renders one row per task in the list", () => {
    const tasks = [
      makeTask({ id: "550e8400-e29b-41d4-a716-446655440001", title: "Buy groceries" }),
      makeTask({ id: "550e8400-e29b-41d4-a716-446655440002", title: "Walk the dog" }),
      makeTask({ id: "550e8400-e29b-41d4-a716-446655440003", title: "Read a book" }),
    ];

    render(<TaskList tasks={tasks} onEdit={vi.fn()} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
  });

  it("renders nothing when there are no tasks", () => {
    const { container } = render(<TaskList tasks={[]} onEdit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
