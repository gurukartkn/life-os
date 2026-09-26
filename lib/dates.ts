import {
  format,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";

// Tasks store due_date as a plain "YYYY-MM-DD" date column, parsed as local midnight.
// With an IANA `timeZone` (a user's user_settings.timezone) it is that zone's calendar
// date for `now` instead — the server's own zone is UTC on Vercel, not the user's.
export function todayIso(timeZone?: string, now: Date = new Date()): string {
  if (!timeZone) return format(now, "yyyy-MM-dd");
  // The en-CA locale formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// The two columns a finished workout log stamps: the instant it finished, and that
// instant's calendar date in the user's timezone. The one place both are derived.
export function workoutLogStamp(
  timeZone: string,
  now: Date = new Date()
): { performed_at: string; performed_on: string } {
  return { performed_at: now.toISOString(), performed_on: todayIso(timeZone, now) };
}

// A friendly "Sep 21, 2026 at 8:00 AM" rendering of an instant (workout_logs.performed_at)
// in the user's timezone — consistent with how performed_on is derived, not the server's own
// zone. Formatted as two separate pieces joined with "at": a combined dateStyle+timeStyle
// string has two commas ("Sep 21, 2026, 8:00 AM"), and replacing just the first turns into
// the wrong one (the one inside the date itself).
export function formatDateTime(date: Date | string, timeZone: string): string {
  const value = new Date(date);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium" }).format(value);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, timeStyle: "short" }).format(value);
  return `${day} at ${time}`;
}

// "6:42 pm" — a clock time in the user's timezone (a session's start).
export function formatClockTime(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(new Date(date))
    .toLowerCase();
}

// A plain "YYYY-MM-DD" date sorts lexically, so "before today" is a string comparison
// against the one todayIso() — the page's overdue count uses the same rule.
export function isOverdue(dueDate: string): boolean {
  return dueDate < todayIso();
}

export function formatDueDate(dueDate: string): string {
  const date = parseISO(dueDate);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

// "Mon 21 Sep" — the date on a task's status pill and in Today's lists.
export function formatShortDate(date: string): string {
  return format(parseISO(date), "EEE d MMM");
}

function ago(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

// "just now" under a minute, then whole minutes, hours and days ago. Takes a full
// timestamp (workout_logs.performed_at), not a date, so "today" still reads as time.
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return ago(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, "hour");
  return ago(Math.floor(hours / 24), "day");
}
