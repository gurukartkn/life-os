import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodoView } from "./todo-view";
import type { Tables } from "@/lib/types/database";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
vi.mock("@/actions/todos", () => ({
  toggleTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

function todo(id: string, title: string, isCompleted: boolean): Tables<"todos"> {
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

const todos = [todo("1", "Open one", false), todo("2", "Done one", true), todo("3", "Open two", false)];

describe("TodoView", () => {
  beforeEach(() => {
    mockSearch = "";
  });

  it("shows every todo with no status param", () => {
    render(<TodoView todos={todos} />);

    expect(screen.getByText("Open one")).toBeInTheDocument();
    expect(screen.getByText("Done one")).toBeInTheDocument();
    expect(screen.getByText("Open two")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "true");
  });

  it("renders deep-linked ?status=active filtered on first render", () => {
    mockSearch = "status=active";
    render(<TodoView todos={todos} />);

    expect(screen.getByText("Open one")).toBeInTheDocument();
    expect(screen.queryByText("Done one")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute("aria-current", "true");
  });

  it("renders deep-linked ?status=completed filtered on first render", () => {
    mockSearch = "status=completed";
    render(<TodoView todos={todos} />);

    expect(screen.getByText("Done one")).toBeInTheDocument();
    expect(screen.queryByText("Open one")).not.toBeInTheDocument();
  });

  it("treats an unknown status as all", () => {
    mockSearch = "status=bogus";
    render(<TodoView todos={todos} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("shows the filter-specific empty state when nothing matches", () => {
    mockSearch = "status=completed";
    render(<TodoView todos={[todo("1", "Open one", false)]} />);

    expect(screen.getByText("Nothing completed yet.")).toBeInTheDocument();
  });
});
