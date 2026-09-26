import { describe, expect, it } from "vitest";
import { daysLeft, goalDateLabel, isGoalOverdue, nextAchievedOn, sortGoals } from "./goals";
import type { Goal, GoalStatus } from "@/lib/validations/goals";

const TODAY = "2026-09-26";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.title ?? "g",
    title: "Goal",
    targetDate: null,
    status: "active",
    achievedOn: null,
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("daysLeft", () => {
  it("counts calendar days to the target, 0 on the day and negative after it", () => {
    expect(daysLeft("2026-11-08", TODAY)).toBe(43);
    expect(daysLeft(TODAY, TODAY)).toBe(0);
    expect(daysLeft("2026-09-20", TODAY)).toBe(-6);
  });
});

describe("goalDateLabel", () => {
  it("says how many days an active goal has left, plural and singular", () => {
    expect(goalDateLabel(goal({ targetDate: "2026-10-05" }), TODAY)).toBe("9 days left");
    expect(goalDateLabel(goal({ targetDate: "2026-09-27" }), TODAY)).toBe("1 day left");
  });

  it("says Due today when the target is today", () => {
    expect(goalDateLabel(goal({ targetDate: TODAY }), TODAY)).toBe("Due today");
  });

  it("says how late an active goal past its target is, plural and singular", () => {
    expect(goalDateLabel(goal({ targetDate: "2026-09-21" }), TODAY)).toBe("Overdue by 5 days");
    expect(goalDateLabel(goal({ targetDate: "2026-09-25" }), TODAY)).toBe("Overdue by 1 day");
  });

  it("says when an achieved goal was reached, from achieved_on, even past its target", () => {
    expect(
      goalDateLabel(goal({ status: "achieved", targetDate: "2026-09-10", achievedOn: "2026-09-15" }), TODAY)
    ).toBe("Reached 15 Sep");
    expect(goalDateLabel(goal({ status: "achieved", achievedOn: "2026-09-15" }), TODAY)).toBe("Reached 15 Sep");
  });

  it("says No date when there is no target to count to", () => {
    expect(goalDateLabel(goal(), TODAY)).toBe("No date");
    expect(goalDateLabel(goal({ status: "dropped" }), TODAY)).toBe("No date");
  });

  it("has nothing to add for a dropped goal with a date", () => {
    expect(goalDateLabel(goal({ status: "dropped", targetDate: "2026-09-01" }), TODAY)).toBeNull();
  });
});

describe("isGoalOverdue", () => {
  it("is true only for an active goal past its target", () => {
    expect(isGoalOverdue(goal({ targetDate: "2026-09-25" }), TODAY)).toBe(true);
    expect(isGoalOverdue(goal({ targetDate: TODAY }), TODAY)).toBe(false);
    expect(isGoalOverdue(goal(), TODAY)).toBe(false);
    expect(isGoalOverdue(goal({ status: "dropped", targetDate: "2026-09-25" }), TODAY)).toBe(false);
    expect(isGoalOverdue(goal({ status: "achieved", targetDate: "2026-09-25", achievedOn: TODAY }), TODAY)).toBe(
      false
    );
  });
});

describe("sortGoals", () => {
  it("orders active by target date with undated last, then achieved by reached date, then dropped by last change", () => {
    const goals = [
      goal({ title: "dropped old", status: "dropped", updatedAt: "2026-08-01T00:00:00.000Z" }),
      goal({ title: "active undated" }),
      goal({ title: "achieved earlier", status: "achieved", achievedOn: "2026-09-01" }),
      goal({ title: "active late", targetDate: "2026-11-08" }),
      goal({ title: "dropped recent", status: "dropped", updatedAt: "2026-09-20T00:00:00.000Z" }),
      goal({ title: "achieved latest", status: "achieved", achievedOn: "2026-09-15" }),
      goal({ title: "active soon", targetDate: "2026-10-02" }),
      goal({ title: "achieved no date", status: "achieved", achievedOn: null }),
    ];

    expect(sortGoals(goals).map((g) => g.title)).toEqual([
      "active soon",
      "active late",
      "active undated",
      "achieved latest",
      "achieved earlier",
      "achieved no date",
      "dropped recent",
      "dropped old",
    ]);
  });

  it("breaks ties by title and leaves its input alone", () => {
    const goals = [goal({ title: "b" }), goal({ title: "a" })];
    expect(sortGoals(goals).map((g) => g.title)).toEqual(["a", "b"]);
    expect(goals.map((g) => g.title)).toEqual(["b", "a"]);
  });
});

describe("nextAchievedOn", () => {
  const cases: [GoalStatus, GoalStatus, string | null, string | null][] = [
    // becoming achieved stamps today
    ["active", "achieved", null, TODAY],
    ["dropped", "achieved", null, TODAY],
    // staying achieved keeps the day it was reached
    ["achieved", "achieved", "2026-09-15", "2026-09-15"],
    // leaving achieved clears it
    ["achieved", "active", "2026-09-15", null],
    ["achieved", "dropped", "2026-09-15", null],
    // never achieved: nothing to keep
    ["active", "active", null, null],
    ["active", "dropped", null, null],
    ["dropped", "active", null, null],
    ["dropped", "dropped", null, null],
  ];

  it.each(cases)("%s → %s with %s gives %s", (prev, next, prevOn, expected) => {
    expect(nextAchievedOn(prev, next, prevOn, TODAY)).toBe(expected);
  });

  it("stamps today if an achieved goal somehow has no achieved_on", () => {
    expect(nextAchievedOn("achieved", "achieved", null, TODAY)).toBe(TODAY);
  });
});
