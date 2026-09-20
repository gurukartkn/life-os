import { describe, expect, it } from "vitest";
import { emptyStateTitle, filterHref, filterTodos, parseStatusFilter } from "./todo-filters";
import type { Tables } from "@/lib/types/database";

function todo(id: string, isCompleted: boolean): Tables<"todos"> {
  return {
    id,
    user_id: "u1",
    title: `Todo ${id}`,
    description: null,
    due_date: null,
    is_completed: isCompleted,
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
}

const todos = [todo("1", false), todo("2", true), todo("3", false), todo("4", true), todo("5", true)];

describe("parseStatusFilter", () => {
  it("accepts active and completed", () => {
    expect(parseStatusFilter("active")).toBe("active");
    expect(parseStatusFilter("completed")).toBe("completed");
  });

  it("falls back to all for missing or unknown values", () => {
    expect(parseStatusFilter(null)).toBe("all");
    expect(parseStatusFilter(undefined)).toBe("all");
    expect(parseStatusFilter("")).toBe("all");
    expect(parseStatusFilter("done")).toBe("all");
  });
});

describe("filterTodos", () => {
  it("returns every todo for all", () => {
    expect(filterTodos(todos, "all")).toHaveLength(5);
  });

  it("returns only open todos for active", () => {
    expect(filterTodos(todos, "active").map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("returns only done todos for completed", () => {
    expect(filterTodos(todos, "completed").map((t) => t.id)).toEqual(["2", "4", "5"]);
  });

  it("keeps the original order", () => {
    expect(filterTodos(todos, "completed").map((t) => t.id)).toEqual(["2", "4", "5"]);
  });
});

describe("filterHref", () => {
  it("omits the param for all and sets it otherwise", () => {
    expect(filterHref("all")).toBe("/todos");
    expect(filterHref("active")).toBe("/todos?status=active");
    expect(filterHref("completed")).toBe("/todos?status=completed");
  });
});

describe("emptyStateTitle", () => {
  it("says what is true for each filter", () => {
    expect(emptyStateTitle("all")).toBe("Nothing on the list today.");
    expect(emptyStateTitle("active")).toBe("Nothing left to do.");
    expect(emptyStateTitle("completed")).toBe("Nothing completed yet.");
  });
});
