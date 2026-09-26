import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";

// When routines and their items are due (Routines boards, Stage 4). Pure functions over
// ISO dates ("YYYY-MM-DD", already in the user's timezone), so the page, the Today
// dashboard and the tests share one set of rules.
//
// Routines: Daily runs every day; Specific days runs on its weekdays; N times a week is
// not tied to days — it runs each day until the week (Monday–Sunday) has N days with
// something done, and stays on today once something is done today.
//
// Items, within a routine that runs today: Every time is always due. Once a week is due
// 7+ days after it was last done. Every Nth is counted in days on a daily routine and in
// sessions (days the routine was done) otherwise. Next due always counts from when an
// item was last done, so a missed item is due again next time — there is no skip.

export type Frequency = "daily" | "times_per_week" | "specific_days";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type RepeatRule = "every_time" | "every_nth" | "weekly";

export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type RoutineSchedule = { frequency: Frequency; timesPerWeek: number | null; weekdays: number[] | null };
export type ItemRepeat = { repeatRule: RepeatRule; repeatEvery: number | null };

// 1 = Monday … 7 = Sunday.
export function isoWeekday(date: string): number {
  const day = parseISO(date).getDay();
  return day === 0 ? 7 : day;
}

export function weekStart(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

function dayName(date: string): string {
  return WEEKDAY_LONG[isoWeekday(date) - 1];
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

// "Daily", "3 times a week", "Sundays", "Mon, Wed, Fri".
export function frequencyLabel({ frequency, timesPerWeek, weekdays }: RoutineSchedule): string {
  if (frequency === "times_per_week") return `${timesPerWeek ?? 1} ${timesPerWeek === 1 ? "time" : "times"} a week`;
  if (frequency === "specific_days") {
    const days = [...(weekdays ?? [])].sort();
    return days.length === 1 ? `${WEEKDAY_LONG[days[0] - 1]}s` : days.map((day) => WEEKDAY_SHORT[day - 1]).join(", ");
  }
  return "Daily";
}

// The rule as a routine row reads it: "every time", "every 2nd day", "once a week".
export function repeatLabel({ repeatRule, repeatEvery }: ItemRepeat, frequency: Frequency): string {
  if (repeatRule === "weekly") return "once a week";
  if (repeatRule === "every_nth") return `every ${ordinal(repeatEvery ?? 2)} ${frequency === "daily" ? "day" : "time"}`;
  return "every time";
}

// The rule as the editor spells it out under an item.
export function repeatHint(repeat: ItemRepeat, frequency: Frequency): string {
  if (repeat.repeatRule === "weekly") return "Once a week · due 7+ days after last done";
  if (repeat.repeatRule === "every_nth") {
    const label = repeatLabel(repeat, frequency);
    return label[0].toUpperCase() + label.slice(1);
  }
  return "Due every time";
}

// Days this week (up to and including today) with anything done on the routine.
export function sessionDaysThisWeek(routineDates: string[], today: string): number {
  const monday = weekStart(today);
  return new Set(routineDates.filter((date) => date >= monday && date <= today)).size;
}

export function isScheduledToday(schedule: RoutineSchedule, today: string, routineDates: string[]): boolean {
  if (schedule.frequency === "daily") return true;
  if (schedule.frequency === "specific_days") return (schedule.weekdays ?? []).includes(isoWeekday(today));
  if (routineDates.includes(today)) return true;
  return sessionDaysThisWeek(routineDates, today) < (schedule.timesPerWeek ?? 1);
}

// The one-line mention for a routine that does not run today: "next Sunday", "next week".
export function nextRunLabel(schedule: RoutineSchedule, today: string): string {
  if (schedule.frequency === "specific_days" && schedule.weekdays?.length) {
    for (let offset = 1; offset <= 7; offset++) {
      const date = format(addDays(parseISO(today), offset), "yyyy-MM-dd");
      if (schedule.weekdays.includes(isoWeekday(date))) return `next ${dayName(date)}`;
    }
  }
  return "next week";
}

export type ItemDueness = { due: true } | { due: false; label: string };

// Whether an item of a routine that runs today is due, from the day it was last done
// before today and the routine's session days.
export function itemDueness(
  repeat: ItemRepeat,
  frequency: Frequency,
  lastDone: string | null,
  routineDates: string[],
  today: string
): ItemDueness {
  if (repeat.repeatRule === "every_time" || !lastDone) return { due: true };

  if (repeat.repeatRule === "weekly") {
    return daysBetween(lastDone, today) >= 7
      ? { due: true }
      : { due: false, label: `due ${dayName(format(addDays(parseISO(lastDone), 7), "yyyy-MM-dd"))}` };
  }

  const every = repeat.repeatEvery ?? 2;
  if (frequency === "daily") {
    return daysBetween(lastDone, today) >= every
      ? { due: true }
      : { due: false, label: `due ${dayName(format(addDays(parseISO(lastDone), every), "yyyy-MM-dd"))}` };
  }
  // Sessions of the routine since the item was last done, not counting today's.
  const sessionsSince = new Set(routineDates.filter((date) => date > lastDone && date < today)).size;
  return sessionsSince >= every - 1 ? { due: true } : { due: false, label: "next time" };
}
