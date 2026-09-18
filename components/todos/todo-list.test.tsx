import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodoList } from "./todo-list";
import type { Tables } from "@/lib/types/database";

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

describe("TodoList", () => {
  it("renders one row per todo in the list", () => {
    const todos = [
      makeTodo({ id: "550e8400-e29b-41d4-a716-446655440001", title: "Buy groceries" }),
      makeTodo({ id: "550e8400-e29b-41d4-a716-446655440002", title: "Walk the dog" }),
      makeTodo({ id: "550e8400-e29b-41d4-a716-446655440003", title: "Read a book" }),
    ];

    render(<TodoList todos={todos} />);

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    expect(screen.getByText("Read a book")).toBeInTheDocument();
  });

  it("renders nothing when there are no todos", () => {
    render(<TodoList todos={[]} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
