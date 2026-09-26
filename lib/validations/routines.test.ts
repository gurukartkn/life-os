import { describe, expect, it } from "vitest";
import { routineCompletionToggleSchema, routineFormSchema } from "./routines";

const item = { title: "Cleanser", repeatRule: "every_time" as const, repeatEvery: null, isActive: true };

function parse(overrides: Record<string, unknown> = {}) {
  return routineFormSchema.safeParse({
    title: "Skincare",
    timeOfDay: "evening",
    frequency: "daily",
    timesPerWeek: null,
    weekdays: null,
    items: [item],
    ...overrides,
  });
}

describe("routineFormSchema", () => {
  it("accepts a daily routine and trims names", () => {
    const result = parse({ title: "  Skincare  " });
    expect(result.success && result.data.title).toBe("Skincare");
  });

  it("requires a name, an active item, and named items", () => {
    expect(parse({ title: " " }).error?.issues[0].message).toBe("Enter a name.");
    expect(parse({ items: [{ ...item, isActive: false }] }).error?.issues[0].message).toBe("Add at least one item.");
    expect(parse({ items: [{ ...item, title: "" }] }).error?.issues[0].message).toBe("Name every item.");
  });

  it("keeps N times a week within 1 to 6", () => {
    expect(parse({ frequency: "times_per_week", timesPerWeek: 7 }).success).toBe(false);
    const result = parse({ frequency: "times_per_week", timesPerWeek: 3, weekdays: [1] });
    expect(result.success && [result.data.timesPerWeek, result.data.weekdays]).toEqual([3, null]);
  });

  it("needs a day for specific days, and makes seven days Daily", () => {
    expect(parse({ frequency: "specific_days", weekdays: [] }).error?.issues[0].message).toBe("Pick at least one day.");
    const seven = parse({ frequency: "specific_days", weekdays: [7, 6, 5, 4, 3, 2, 1] });
    expect(seven.success && [seven.data.frequency, seven.data.weekdays]).toEqual(["daily", null]);
    const some = parse({ frequency: "specific_days", weekdays: [7, 1, 7] });
    expect(some.success && some.data.weekdays).toEqual([1, 7]);
  });

  it("keeps a repeat count only for Every Nth, within 2 to 30", () => {
    const nth = parse({ items: [{ ...item, repeatRule: "every_nth", repeatEvery: null }] });
    expect(nth.success && nth.data.items[0].repeatEvery).toBe(2);
    const weekly = parse({ items: [{ ...item, repeatRule: "weekly", repeatEvery: 5 }] });
    expect(weekly.success && weekly.data.items[0].repeatEvery).toBeNull();
    expect(parse({ items: [{ ...item, repeatRule: "every_nth", repeatEvery: 31 }] }).success).toBe(false);
  });

  it("refuses the same item twice", () => {
    const id = "5b6f3d40-5555-4a11-8b11-555555555555";
    expect(parse({ items: [{ ...item, id }, { ...item, id }] }).error?.issues[0].message).toBe("Each item can appear only once.");
  });
});

describe("routineCompletionToggleSchema", () => {
  it("wants a YYYY-MM-DD day", () => {
    const base = { routine_item_id: "5b6f3d40-5555-4a11-8b11-555555555555", is_checking: true };
    expect(routineCompletionToggleSchema.safeParse({ ...base, period_start: "2026-09-23" }).success).toBe(true);
    expect(routineCompletionToggleSchema.safeParse({ ...base, period_start: "yesterday" }).success).toBe(false);
  });
});
