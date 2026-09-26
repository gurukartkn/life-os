import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Goal, GoalStatus } from "@/lib/validations/goals";

// Pure rules for goals (5a · Goals boards, Today's Goals card). Dates are local
// "YYYY-MM-DD" strings already in the user's timezone (todayIso(timeZone)), so the
// screens and the tests share one set of rules and nothing here reads the clock.

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  dropped: "Dropped",
};

export const GOAL_STATUS_TONES = { active: "violet", achieved: "teal", dropped: "neutral" } as const;

// "8 Nov 2026" — a target date in the list and the detail header.
export function formatGoalDate(date: string): string {
  return format(parseISO(date), "d MMM yyyy");
}

// "8 Nov" — the Today card and the "Reached" label.
export function formatGoalDay(date: string): string {
  return format(parseISO(date), "d MMM");
}

// Whole calendar days from today to the target: 0 on the day, negative once past it.
export function daysLeft(targetDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(targetDate), parseISO(today));
}

function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

type DatedGoal = Pick<Goal, "status" | "targetDate" | "achievedOn">;

// The short line beside a goal's date: how long an active goal has left (or how late it
// is), when an achieved goal was reached, "No date" when there is nothing to say. A
// dropped goal with a date gets no line (null).
export function goalDateLabel(goal: DatedGoal, today: string): string | null {
  if (goal.status === "achieved" && goal.achievedOn) return `Reached ${formatGoalDay(goal.achievedOn)}`;
  if (!goal.targetDate) return "No date";
  if (goal.status !== "active") return null;
  const left = daysLeft(goal.targetDate, today);
  if (left === 0) return "Due today";
  if (left > 0) return `${days(left)} left`;
  return `Overdue by ${days(-left)}`;
}

// An active goal past its target: its date label takes the pink attention colour.
export function isGoalOverdue(goal: DatedGoal, today: string): boolean {
  return goal.status === "active" && goal.targetDate !== null && goal.targetDate < today;
}

const STATUS_ORDER: Record<GoalStatus, number> = { active: 0, achieved: 1, dropped: 2 };

// Plain "YYYY-MM-DD" dates and ISO timestamps both sort as strings; missing values go last.
function compareNullsLast(a: string | null, b: string | null, direction: 1 | -1): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a < b ? -1 : 1) * direction;
}

// The Goals list order: active goals by target date (soonest first, undated last), then
// achieved goals by when they were reached (latest first), then dropped goals by when
// they last changed (latest first). Title breaks ties so the order is stable.
export function sortGoals<T extends Pick<Goal, "status" | "targetDate" | "achievedOn" | "updatedAt" | "title">>(
  goals: T[]
): T[] {
  return [...goals].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    let byDate = 0;
    if (a.status === "active") byDate = compareNullsLast(a.targetDate, b.targetDate, 1);
    else if (a.status === "achieved") byDate = compareNullsLast(a.achievedOn, b.achievedOn, -1);
    else byDate = compareNullsLast(a.updatedAt, b.updatedAt, -1);
    return byDate !== 0 ? byDate : a.title.localeCompare(b.title);
  });
}

// achieved_on after a save: becoming achieved stamps today, staying achieved keeps the
// day it was reached, and any other status clears it.
export function nextAchievedOn(
  prevStatus: GoalStatus,
  nextStatus: GoalStatus,
  prevAchievedOn: string | null,
  today: string
): string | null {
  if (nextStatus !== "achieved") return null;
  if (prevStatus === "achieved") return prevAchievedOn ?? today;
  return today;
}
