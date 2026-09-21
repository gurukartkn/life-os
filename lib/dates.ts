import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  parseISO,
  startOfWeek,
} from "date-fns";

// Tasks store due_date as a plain "YYYY-MM-DD" date column, parsed as local midnight.
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// Routine completions are period-stamped: the day itself for a daily routine,
// or that week's Monday for a weekly one — the "period_start" row a completion attaches to.
export function periodStartFor(cadence: string): string {
  if (cadence === "weekly") {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  return todayIso();
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

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}
