import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDueDate, formatRelative, isOverdue, periodStartFor, todayIso } from "./dates";

describe("dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17)); // 2026-09-17, local midnight
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("todayIso", () => {
    it("returns today's date as YYYY-MM-DD", () => {
      expect(todayIso()).toBe("2026-09-17");
    });
  });

  describe("formatDueDate", () => {
    it("returns 'Today' for today's date", () => {
      expect(formatDueDate("2026-09-17")).toBe("Today");
    });

    it("returns 'Tomorrow' for tomorrow's date", () => {
      expect(formatDueDate("2026-09-18")).toBe("Tomorrow");
    });

    it("returns a short month/day for other dates", () => {
      expect(formatDueDate("2026-12-25")).toBe("Dec 25");
    });
  });

  describe("isOverdue", () => {
    it("is false for today", () => {
      expect(isOverdue("2026-09-17")).toBe(false);
    });

    it("is false for a future date", () => {
      expect(isOverdue("2026-09-18")).toBe(false);
    });

    it("is true for a past date", () => {
      expect(isOverdue("2026-09-16")).toBe(true);
    });
  });

  describe("periodStartFor", () => {
    it("returns today for a daily cadence", () => {
      expect(periodStartFor("daily")).toBe("2026-09-17");
    });

    it("returns that week's Monday for a weekly cadence", () => {
      expect(periodStartFor("weekly")).toBe("2026-09-14");
    });
  });

  describe("formatRelative", () => {
    it("returns a relative time string with a suffix", () => {
      expect(formatRelative("2026-09-14")).toBe("3 days ago");
    });

    it("returns 'about 1 month ago' for a month-old date", () => {
      expect(formatRelative("2026-08-17")).toBe("about 1 month ago");
    });
  });
});
