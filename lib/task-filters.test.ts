import { describe, expect, it } from "vitest";
import { emptyStateTitle, filterHref, filterTasks, parseStatusFilter } from "./task-filters";
import type { Tables } from "@/lib/types/database";

function task(id: string, isCompleted: boolean): Tables<"tasks"> {
  return {
    id,
    user_id: "u1",
    title: `Task ${id}`,
    description: null,
    due_date: null,
    is_completed: isCompleted,
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
}

const tasks = [task("1", false), task("2", true), task("3", false), task("4", true), task("5", true)];

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

describe("filterTasks", () => {
  it("returns every task for all", () => {
    expect(filterTasks(tasks, "all")).toHaveLength(5);
  });

  it("returns only open tasks for active", () => {
    expect(filterTasks(tasks, "active").map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("returns only done tasks for completed", () => {
    expect(filterTasks(tasks, "completed").map((t) => t.id)).toEqual(["2", "4", "5"]);
  });

  it("keeps the original order", () => {
    expect(filterTasks(tasks, "completed").map((t) => t.id)).toEqual(["2", "4", "5"]);
  });
});

describe("filterHref", () => {
  it("omits the param for all and sets it otherwise", () => {
    expect(filterHref("all")).toBe("/tasks");
    expect(filterHref("active")).toBe("/tasks?status=active");
    expect(filterHref("completed")).toBe("/tasks?status=completed");
  });
});

describe("emptyStateTitle", () => {
  it("says what is true for each filter", () => {
    expect(emptyStateTitle("all")).toBe("Nothing on the list today.");
    expect(emptyStateTitle("active")).toBe("Nothing left to do.");
    expect(emptyStateTitle("completed")).toBe("Nothing completed yet.");
  });
});
