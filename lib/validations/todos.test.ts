import { describe, expect, it } from "vitest";
import { todoDeleteSchema, todoInsertSchema, todoToggleSchema } from "./todos";

describe("todoInsertSchema", () => {
  it("accepts a title with no other fields", () => {
    const result = todoInsertSchema.safeParse({ title: "Buy groceries" });
    expect(result.success).toBe(true);
  });

  it("accepts a title with a description and due date", () => {
    const result = todoInsertSchema.safeParse({
      title: "Buy groceries",
      description: "Milk, eggs, bread",
      due_date: "2026-09-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = todoInsertSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = todoInsertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = todoInsertSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a description over 2000 characters", () => {
    const result = todoInsertSchema.safeParse({
      title: "Buy groceries",
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed due date", () => {
    const result = todoInsertSchema.safeParse({ title: "Buy groceries", due_date: "09/20/2026" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty due date", () => {
    const result = todoInsertSchema.safeParse({ title: "Buy groceries", due_date: "" });
    expect(result.success).toBe(true);
  });
});

describe("todoToggleSchema", () => {
  it("accepts a valid id and boolean", () => {
    const result = todoToggleSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = todoToggleSchema.safeParse({ id: "not-a-uuid", is_completed: true });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean is_completed", () => {
    const result = todoToggleSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      is_completed: "true",
    });
    expect(result.success).toBe(false);
  });
});

describe("todoDeleteSchema", () => {
  it("accepts a valid id", () => {
    const result = todoDeleteSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = todoDeleteSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
