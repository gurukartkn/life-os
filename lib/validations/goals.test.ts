import { describe, expect, it } from "vitest";
import { goalInsertSchema } from "./goals";

describe("goalInsertSchema", () => {
  it("accepts a title with no target date", () => {
    const result = goalInsertSchema.safeParse({ title: "Run a marathon" });
    expect(result.success).toBe(true);
  });

  it("accepts a title with a target date", () => {
    const result = goalInsertSchema.safeParse({
      title: "Run a marathon",
      target_date: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = goalInsertSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = goalInsertSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed target date", () => {
    const result = goalInsertSchema.safeParse({
      title: "Run a marathon",
      target_date: "31-12-2026",
    });
    expect(result.success).toBe(false);
  });
});
