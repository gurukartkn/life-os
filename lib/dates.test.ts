import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDateTime,
  formatDueDate,
  formatRelativeTime,
  isOverdue,
  periodStartFor,
  todayIso,
  workoutLogStamp,
} from "./dates";

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

  describe("formatDateTime", () => {
    it("puts the date and time on either side of 'at', not split on the date's own comma", () => {
      // A combined Intl dateStyle+timeStyle string has two commas ("Sep 21, 2026, 8:00 AM") —
      // this guards against replacing the wrong one and reading "Sep 21 at 2026, 8:00 AM".
      expect(formatDateTime("2026-09-21T08:00:00.000Z", "UTC")).toBe("Sep 21, 2026 at 8:00 AM");
    });

    it("renders in the given timezone, not UTC", () => {
      expect(formatDateTime("2026-09-21T23:30:00.000Z", "Asia/Kolkata")).toBe("Sep 22, 2026 at 5:00 AM");
    });
  });

  describe("todayIso with a timezone", () => {
    // 2026-09-21 23:30 UTC is already the 22nd in Kolkata (+05:30), still the 21st in New York.
    const now = new Date("2026-09-21T23:30:00Z");

    it("is the calendar date in that zone", () => {
      expect(todayIso("Asia/Kolkata", now)).toBe("2026-09-22");
      expect(todayIso("America/New_York", now)).toBe("2026-09-21");
      expect(todayIso("UTC", now)).toBe("2026-09-21");
    });
  });

  describe("workoutLogStamp", () => {
    it("stamps the instant and its date in the user's timezone", () => {
      const now = new Date("2026-09-21T23:30:00Z");

      expect(workoutLogStamp("Asia/Kolkata", now)).toEqual({
        performed_at: "2026-09-21T23:30:00.000Z",
        performed_on: "2026-09-22",
      });
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

    it("says 'just now' under 60 seconds", () => {
      expect(formatRelativeTime(ago(0), now)).toBe("just now");
      expect(formatRelativeTime(ago(59), now)).toBe("just now");
    });

    it("switches to minutes at 60 seconds and to hours at 60 minutes", () => {
      expect(formatRelativeTime(ago(60), now)).toBe("1 minute ago");
      expect(formatRelativeTime(ago(59 * 60), now)).toBe("59 minutes ago");
      expect(formatRelativeTime(ago(60 * 60), now)).toBe("1 hour ago");
    });

    it("switches to days at 24 hours", () => {
      expect(formatRelativeTime(ago(23 * 3600), now)).toBe("23 hours ago");
      expect(formatRelativeTime(ago(24 * 3600), now)).toBe("1 day ago");
      expect(formatRelativeTime(ago(3 * 24 * 3600), now)).toBe("3 days ago");
    });

    it("accepts an ISO string and treats a future time as just now", () => {
      expect(formatRelativeTime("2026-09-21T11:00:00Z", now)).toBe("1 hour ago");
      expect(formatRelativeTime("2026-09-21T12:05:00Z", now)).toBe("just now");
    });
  });
});
