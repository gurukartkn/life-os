import { describe, expect, it } from "vitest";
import {
  createRoutineSchema,
  routineCompletionToggleSchema,
  routineDeleteSchema,
  routineItemInsertSchema,
} from "./routines";

describe("createRoutineSchema", () => {
  const item = { title: "Meditate" };

  it("accepts a title, cadence, and at least one item", () => {
    const result = createRoutineSchema.safeParse({
      title: "Morning routine",
      cadence: "daily",
      items: [item],
    });
    expect(result.success).toBe(true);
  });

  it("accepts weekly cadence", () => {
    const result = createRoutineSchema.safeParse({
      title: "Weekly review",
      cadence: "weekly",
      items: [item],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createRoutineSchema.safeParse({ title: "", cadence: "daily", items: [item] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid cadence", () => {
    const result = createRoutineSchema.safeParse({
      title: "Morning routine",
      cadence: "monthly",
      items: [item],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty item list", () => {
    const result = createRoutineSchema.safeParse({
      title: "Morning routine",
      cadence: "daily",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an item with an empty title", () => {
    const result = createRoutineSchema.safeParse({
      title: "Morning routine",
      cadence: "daily",
      items: [{ title: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("routineDeleteSchema", () => {
  it("accepts a valid id", () => {
    const result = routineDeleteSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = routineDeleteSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("routineItemInsertSchema", () => {
  it("accepts a routine id and title", () => {
    const result = routineItemInsertSchema.safeParse({
      routine_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Stretch",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const result = routineItemInsertSchema.safeParse({
      routine_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("routineCompletionToggleSchema", () => {
  const base = {
    routine_item_id: "550e8400-e29b-41d4-a716-446655440000",
    period_start: "2026-09-18",
  };

  it("accepts a valid check", () => {
    const result = routineCompletionToggleSchema.safeParse({ ...base, is_checking: true });
    expect(result.success).toBe(true);
  });

  it("accepts a valid uncheck", () => {
    const result = routineCompletionToggleSchema.safeParse({ ...base, is_checking: false });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed period_start", () => {
    const result = routineCompletionToggleSchema.safeParse({
      ...base,
      period_start: "09/18/2026",
      is_checking: true,
    });
    expect(result.success).toBe(false);
  });
});
