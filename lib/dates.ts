import { format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from "date-fns";

// Todos store due_date as a plain "YYYY-MM-DD" date column, parsed as local midnight.
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isOverdue(dueDate: string): boolean {
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
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
