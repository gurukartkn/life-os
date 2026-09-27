import { describe, expect, it } from "vitest";
import {
  anchorDayOf,
  budgetStatus,
  formatInr,
  formatMonth,
  isRealDate,
  monthRange,
  nextOccurrence,
  paiseToInput,
  shiftMonth,
  toPaise,
} from "./money";

describe("toPaise", () => {
  it.each([
    ["640", 64000],
    ["640.5", 64050],
    ["640.05", 64005],
    ["0.1", 10],
    ["0.29", 29],
    ["1,24,530.10", 12453010],
    ["₹ 99.99", 9999],
    ["  12  ", 1200],
    ["0", 0],
  ])("%s → %d paise, with no float error", (input, paise) => {
    expect(toPaise(input)).toBe(paise);
  });

  it.each(["", "abc", "-5", "1.234", "1.", ".5x", "1e3", "12 34"])("refuses %j", (input) => {
    expect(toPaise(input)).toBeNull();
  });

  it("round-trips through the form value", () => {
    expect(paiseToInput(64050)).toBe("640.50");
    expect(paiseToInput(64000)).toBe("640");
    expect(toPaise(paiseToInput(12453010))).toBe(12453010);
  });
});

describe("formatInr", () => {
  it("groups the Indian way", () => {
    expect(formatInr(12453000)).toBe("₹1,24,530");
    expect(formatInr(1234567800)).toBe("₹1,23,45,678");
    expect(formatInr(99900)).toBe("₹999");
    expect(formatInr(100000)).toBe("₹1,000");
    expect(formatInr(0)).toBe("₹0");
  });

  it("shows paise only when there are some", () => {
    expect(formatInr(12453010)).toBe("₹1,24,530.10");
    expect(formatInr(64005)).toBe("₹640.05");
    expect(formatInr(64000)).toBe("₹640");
  });

  it("signs by kind: − for an expense, + for income", () => {
    expect(formatInr(64000, { kind: "expense" })).toBe("−₹640");
    expect(formatInr(7300000, { kind: "income" })).toBe("+₹73,000");
  });

  it("signs a plain amount by its value when asked, and always marks a negative one", () => {
    expect(formatInr(-190000)).toBe("−₹1,900");
    expect(formatInr(190000, { signed: true })).toBe("+₹1,900");
    expect(formatInr(190000)).toBe("₹1,900");
  });
});

describe("months", () => {
  it("monthRange gives the first and last day, leap years included", () => {
    expect(monthRange("2026-09")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("shiftMonth crosses years both ways", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });

  it("formatMonth names the month", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
  });

  it("isRealDate refuses impossible dates", () => {
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("26-09-01")).toBe(false);
  });
});

describe("budgetStatus", () => {
  it("under budget", () => {
    expect(budgetStatus(820000, 1000000)).toEqual({ percent: 82, fill: 82, overByPaise: 0 });
  });

  it("exactly 100%", () => {
    expect(budgetStatus(2000000, 2000000)).toEqual({ percent: 100, fill: 100, overByPaise: 0 });
  });

  it("just under 100% never rounds up to it", () => {
    expect(budgetStatus(999999, 1000000).percent).toBe(99);
  });

  it("over budget: the bar is capped and the excess is written out", () => {
    expect(budgetStatus(640000, 500000)).toEqual({ percent: 128, fill: 100, overByPaise: 140000 });
  });
});

describe("nextOccurrence", () => {
  it("weekly adds seven days, across a month and a year end", () => {
    expect(nextOccurrence("weekly", 23, "2026-09-23")).toBe("2026-09-30");
    expect(nextOccurrence("weekly", 28, "2026-12-28")).toBe("2027-01-04");
  });

  it("monthly from the 31st clamps through February and comes back", () => {
    let date = "2026-01-31";
    const dates = [];
    for (let i = 0; i < 3; i++) {
      date = nextOccurrence("monthly", 31, date);
      dates.push(date);
    }
    expect(dates).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("monthly from the 31st lands on 29 Feb in a leap year", () => {
    expect(nextOccurrence("monthly", 31, "2028-01-31")).toBe("2028-02-29");
    expect(nextOccurrence("monthly", 30, "2028-01-30")).toBe("2028-02-29");
  });

  it("monthly wraps the year", () => {
    expect(nextOccurrence("monthly", 5, "2026-12-05")).toBe("2027-01-05");
  });

  it("yearly from 29 Feb is on the 28th until the next leap year", () => {
    expect(nextOccurrence("yearly", 29, "2028-02-29")).toBe("2029-02-28");
    expect(nextOccurrence("yearly", 29, "2031-02-28")).toBe("2032-02-29");
  });

  it("yearly keeps the month", () => {
    expect(nextOccurrence("yearly", 12, "2027-03-12")).toBe("2028-03-12");
  });

  it("anchorDayOf is the day of the date", () => {
    expect(anchorDayOf("2026-10-31")).toBe(31);
    expect(anchorDayOf("2026-10-05")).toBe(5);
  });
});
