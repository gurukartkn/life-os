import { describe, expect, it } from "vitest";
import {
  frequencyLabel,
  isScheduledToday,
  isoWeekday,
  itemDueness,
  nextRunLabel,
  ordinal,
  repeatHint,
  repeatLabel,
  sessionDaysThisWeek,
} from "./schedule";

// 2026-09-23 is a Wednesday; its week runs Mon 21 – Sun 27 September.
const WED = "2026-09-23";

describe("labels", () => {
  it("names frequencies", () => {
    expect(frequencyLabel({ frequency: "daily", timesPerWeek: null, weekdays: null })).toBe("Daily");
    expect(frequencyLabel({ frequency: "times_per_week", timesPerWeek: 3, weekdays: null })).toBe("3 times a week");
    expect(frequencyLabel({ frequency: "times_per_week", timesPerWeek: 1, weekdays: null })).toBe("1 time a week");
    expect(frequencyLabel({ frequency: "specific_days", timesPerWeek: null, weekdays: [7] })).toBe("Sundays");
    expect(frequencyLabel({ frequency: "specific_days", timesPerWeek: null, weekdays: [5, 1, 3] })).toBe("Mon, Wed, Fri");
  });

  it("words repeat rules by the routine's frequency", () => {
    expect(repeatLabel({ repeatRule: "every_nth", repeatEvery: 2 }, "daily")).toBe("every 2nd day");
    expect(repeatLabel({ repeatRule: "every_nth", repeatEvery: 3 }, "times_per_week")).toBe("every 3rd time");
    expect(repeatLabel({ repeatRule: "weekly", repeatEvery: null }, "daily")).toBe("once a week");
    expect(repeatHint({ repeatRule: "every_time", repeatEvery: null }, "daily")).toBe("Due every time");
    expect(repeatHint({ repeatRule: "every_nth", repeatEvery: 2 }, "specific_days")).toBe("Every 2nd time");
    expect(repeatHint({ repeatRule: "weekly", repeatEvery: null }, "daily")).toBe("Once a week · due 7+ days after last done");
  });

  it("makes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});

describe("routine scheduling", () => {
  it("knows the weekday", () => {
    expect(isoWeekday(WED)).toBe(3);
    expect(isoWeekday("2026-09-27")).toBe(7);
  });

  it("runs daily routines every day and specific-day routines on their days", () => {
    expect(isScheduledToday({ frequency: "daily", timesPerWeek: null, weekdays: null }, WED, [])).toBe(true);
    expect(isScheduledToday({ frequency: "specific_days", timesPerWeek: null, weekdays: [7] }, WED, [])).toBe(false);
    expect(isScheduledToday({ frequency: "specific_days", timesPerWeek: null, weekdays: [1, 3] }, WED, [])).toBe(true);
  });

  it("runs N times a week until the week has N session days, and stays today once started", () => {
    const three = { frequency: "times_per_week" as const, timesPerWeek: 3, weekdays: null };
    // Last week's sessions don't count.
    expect(isScheduledToday(three, WED, ["2026-09-18", "2026-09-19", "2026-09-20"])).toBe(true);
    expect(isScheduledToday(three, WED, ["2026-09-21", "2026-09-22"])).toBe(true);
    expect(isScheduledToday(three, "2026-09-24", ["2026-09-21", "2026-09-22", WED])).toBe(false);
    expect(isScheduledToday(three, WED, ["2026-09-21", "2026-09-22", WED])).toBe(true);
    expect(sessionDaysThisWeek(["2026-09-21", "2026-09-21", WED, "2026-09-20"], WED)).toBe(2);
  });

  it("says when a routine that isn't on today runs next", () => {
    expect(nextRunLabel({ frequency: "specific_days", timesPerWeek: null, weekdays: [7] }, WED)).toBe("next Sunday");
    expect(nextRunLabel({ frequency: "specific_days", timesPerWeek: null, weekdays: [3] }, WED)).toBe("next Wednesday");
    expect(nextRunLabel({ frequency: "times_per_week", timesPerWeek: 2, weekdays: null }, WED)).toBe("next week");
  });
});

describe("item dueness", () => {
  const everyTime = { repeatRule: "every_time" as const, repeatEvery: null };
  const weekly = { repeatRule: "weekly" as const, repeatEvery: null };
  const everySecond = { repeatRule: "every_nth" as const, repeatEvery: 2 };

  it("makes every-time items and never-done items due", () => {
    expect(itemDueness(everyTime, "daily", WED, [], WED)).toEqual({ due: true });
    expect(itemDueness(weekly, "daily", null, [], WED)).toEqual({ due: true });
  });

  it("makes a weekly item due 7+ days after it was last done", () => {
    expect(itemDueness(weekly, "daily", "2026-09-16", [], WED)).toEqual({ due: true });
    expect(itemDueness(weekly, "daily", "2026-09-19", [], WED)).toEqual({ due: false, label: "due Saturday" });
  });

  it("counts every Nth in days on a daily routine", () => {
    expect(itemDueness(everySecond, "daily", "2026-09-21", [], WED)).toEqual({ due: true });
    expect(itemDueness(everySecond, "daily", "2026-09-22", [], WED)).toEqual({ due: false, label: "due Thursday" });
  });

  it("counts every Nth in sessions otherwise, so a missed item is due next time", () => {
    // Done Monday; the routine was next done Tuesday (skipped); due at the session after.
    expect(itemDueness(everySecond, "times_per_week", "2026-09-21", ["2026-09-21"], WED)).toEqual({
      due: false,
      label: "next time",
    });
    expect(itemDueness(everySecond, "times_per_week", "2026-09-21", ["2026-09-21", "2026-09-22"], WED)).toEqual({
      due: true,
    });
  });
});
