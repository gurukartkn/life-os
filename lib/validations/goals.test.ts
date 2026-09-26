import { describe, expect, it } from "vitest";
import {
  goalFromRow,
  goalInputSchema,
  goalToRow,
  goalUpdateSchema,
  linkTargetSchema,
  setLinksSchema,
  toGoalStatus,
} from "./goals";

const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("goalInputSchema", () => {
  it("accepts a title with no target date, and trims it", () => {
    const result = goalInputSchema.safeParse({ title: "  Run a 10K ", status: "active" });
    expect(result.success && result.data).toEqual({ title: "Run a 10K", targetDate: undefined, status: "active" });
  });

  it("treats an empty target date as none, and accepts a past one", () => {
    expect(goalInputSchema.parse({ title: "a", targetDate: "", status: "active" }).targetDate).toBeUndefined();
    expect(goalInputSchema.parse({ title: "a", targetDate: "2020-01-01", status: "active" }).targetDate).toBe(
      "2020-01-01"
    );
  });

  it("rejects an empty or blank title", () => {
    for (const title of ["", "   "]) {
      const result = goalInputSchema.safeParse({ title, status: "active" });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Enter a title.");
    }
  });

  it("rejects a title over 200 characters", () => {
    expect(goalInputSchema.safeParse({ title: "a".repeat(201), status: "active" }).success).toBe(false);
  });

  it("rejects a malformed target date", () => {
    expect(goalInputSchema.safeParse({ title: "a", targetDate: "31-12-2026", status: "active" }).success).toBe(false);
  });

  it("rejects an unknown status, including the v1 values", () => {
    for (const status of ["done", "completed", "abandoned", ""]) {
      expect(goalInputSchema.safeParse({ title: "a", status }).success).toBe(false);
    }
  });

  it("needs a real id to update", () => {
    expect(goalUpdateSchema.safeParse({ id: "nope", title: "a", status: "active" }).success).toBe(false);
    expect(goalUpdateSchema.safeParse({ id: ID, title: "a", status: "achieved" }).success).toBe(true);
  });
});

describe("linkTargetSchema", () => {
  it("accepts each item type a goal can link to", () => {
    for (const type of ["task", "routine", "workout", "exercise"]) {
      expect(linkTargetSchema.safeParse({ type, id: ID }).success).toBe(true);
    }
  });

  it("rejects an unknown link type, a goal as the target, and a bad id", () => {
    expect(linkTargetSchema.safeParse({ type: "workout_log", id: ID }).success).toBe(false);
    expect(linkTargetSchema.safeParse({ type: "goal", id: ID }).success).toBe(false);
    expect(linkTargetSchema.safeParse({ type: "task", id: "nope" }).success).toBe(false);
  });

  it("rejects an unknown type in setLinks too", () => {
    expect(setLinksSchema.safeParse({ goalId: ID, type: "todo", ids: [] }).success).toBe(false);
    expect(setLinksSchema.safeParse({ goalId: ID, type: "exercise", ids: [ID] }).success).toBe(true);
  });
});

describe("snake_case mapping", () => {
  it("maps a row to a goal, reading the v1 status values as their v2 names", () => {
    const row = {
      id: ID,
      title: "Run a 10K",
      target_date: "2026-11-08",
      status: "completed",
      achieved_on: "2026-09-15",
      updated_at: "2026-09-15T10:00:00.000Z",
    };
    expect(goalFromRow(row)).toEqual({
      id: ID,
      title: "Run a 10K",
      targetDate: "2026-11-08",
      status: "achieved",
      achievedOn: "2026-09-15",
      updatedAt: "2026-09-15T10:00:00.000Z",
    });
    expect(toGoalStatus("abandoned")).toBe("dropped");
    expect(toGoalStatus(null)).toBe("active");
  });

  it("maps form values to the columns it writes", () => {
    expect(goalToRow({ title: "a", targetDate: undefined, status: "achieved" }, "2026-09-26")).toEqual({
      title: "a",
      target_date: null,
      status: "achieved",
      achieved_on: "2026-09-26",
    });
  });
});
