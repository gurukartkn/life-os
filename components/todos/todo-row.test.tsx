import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoRow } from "./todo-row";
import { deleteTodo, toggleTodo } from "@/actions/todos";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/todos", () => ({
  toggleTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

const mockedToggle = vi.mocked(toggleTodo);
const mockedDelete = vi.mocked(deleteTodo);

function makeTodo(overrides: Partial<Tables<"todos">> = {}): Tables<"todos"> {
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

describe("TodoRow", () => {
  beforeEach(() => {
    mockedToggle.mockReset();
    mockedDelete.mockReset();
  });

  it("calls toggleTodo when the checkbox is checked", async () => {
    mockedToggle.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<TodoRow todo={makeTodo()} />);

    await user.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(mockedToggle).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", true)
    );
  });

  it("calls deleteTodo when the delete button is clicked", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<TodoRow todo={makeTodo()} />);

    await user.click(screen.getByRole("button", { name: "Delete todo" }));

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000")
    );
  });

  it("shows an overdue due date in the pink status color", () => {
    render(<TodoRow todo={makeTodo({ due_date: "2020-01-01" })} />);
    expect(screen.getByText(/Due /)).toHaveClass("text-pink-ink");
  });

  it("shows completed todos with strikethrough styling", () => {
    render(<TodoRow todo={makeTodo({ is_completed: true })} />);
    expect(screen.getByText("Buy groceries")).toHaveClass("line-through");
  });
});
