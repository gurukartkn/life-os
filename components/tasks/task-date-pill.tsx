import { AlertCircle, CalendarDays } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { formatShortDate, isOverdue, todayIso } from "@/lib/dates";

// The due-date pill on a task row (Tasks board): pink "Overdue · Mon 21 Sep" for an
// open task past its date, blue "Today", otherwise a neutral date with a calendar
// icon. A completed task is never overdue. No date, no pill.
export function TaskDatePill({ dueDate, isCompleted }: { dueDate: string | null; isCompleted: boolean }) {
  if (!dueDate) return null;

  if (!isCompleted && isOverdue(dueDate)) {
    return (
      <Tag tone="pink">
        <AlertCircle strokeWidth={1.75} />
        Overdue · {formatShortDate(dueDate)}
      </Tag>
    );
  }

  if (!isCompleted && dueDate === todayIso()) {
    return <Tag tone="blue">Today</Tag>;
  }

  return (
    <Tag>
      <CalendarDays strokeWidth={1.75} />
      {formatShortDate(dueDate)}
    </Tag>
  );
}
