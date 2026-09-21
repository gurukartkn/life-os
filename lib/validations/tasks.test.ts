import { describe, expect, it } from "vitest";
import { format, subDays } from "date-fns";
import { taskDeleteSchema, taskInsertSchema, taskToggleSchema } from "./tasks";

describe("taskInsertSchema", () => {
  it("accepts a title with no other fields", () => {
    const result = taskInsertSchema.safeParse({ title: "Buy groceries" });
    expect(result.success).toBe(true);
  });

  it("accepts a title with a description and due date", () => {
    const result = taskInsertSchema.safeParse({
      title: "Buy groceries",
      description: "Milk, eggs, bread",
      due_date: "2026-09-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = taskInsertSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = taskInsertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = taskInsertSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a description over 2000 characters", () => {
    const result = taskInsertSchema.safeParse({
      title: "Buy groceries",
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed due date", () => {
    const result = taskInsertSchema.safeParse({ title: "Buy groceries", due_date: "09/20/2026" });
    expect(result.success).toBe(false);
  });

  // v2 Stage 2: a task can be created already overdue, so the schema has no past-date rule.
  it("accepts a due date before today", () => {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    for (const due_date of [yesterday, "2000-01-01"]) {
      const result = taskInsertSchema.safeParse({ title: "Renew passport", due_date });
      expect(result.success).toBe(true);
    }
  });

  it("accepts an empty due date", () => {
    const result = taskInsertSchema.safeParse({ title: "Buy groceries", due_date: "" });
    expect(result.success).toBe(true);
  });
});

describe("taskToggleSchema", () => {
  it("accepts a valid id and boolean", () => {
    const result = taskToggleSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = taskToggleSchema.safeParse({ id: "not-a-uuid", is_completed: true });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean is_completed", () => {
    const result = taskToggleSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_completed: "true",
    });
    expect(result.success).toBe(false);
  });
});

describe("taskDeleteSchema", () => {
  it("accepts a valid id", () => {
    const result = taskDeleteSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = taskDeleteSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
