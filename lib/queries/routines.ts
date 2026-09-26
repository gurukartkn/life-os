import { format, parseISO, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatClockTime, formatShortDate } from "@/lib/dates";
import { logError } from "@/lib/errors";
import {
  frequencyLabel,
  isScheduledToday,
  itemDueness,
  nextRunLabel,
  repeatLabel,
  sessionDaysThisWeek,
  TIME_OF_DAY_LABELS,
  TIMES_OF_DAY,
  type Frequency,
  type RepeatRule,
  type RoutineSchedule,
  type TimeOfDay,
} from "@/lib/routines/schedule";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type TodayItem = {
  id: string;
  title: string;
  checked: boolean;
  // "every 2nd day · last done Mon 21 Sep"
  detail: string;
  // "Done 7:10 pm" when checked today.
  doneAt: string | null;
  // Why it is not due today ("due Saturday", "next time"); null when due.
  notDueLabel: string | null;
};

export type TodayRoutine = {
  id: string;
  title: string;
  frequencyLabel: string;
  // "2 of 3 this week" on N-times-a-week routines.
  weekProgress: string | null;
  items: TodayItem[];
};

export type RoutinesToday = {
  today: string;
  groups: { timeOfDay: TimeOfDay; label: string; routines: TodayRoutine[] }[];
  // Routines that run today but have items that are not due, grouped per routine.
  notDue: TodayRoutine[];
  // Routines that do not run today at all: one line each.
  notScheduled: { id: string; title: string; label: string }[];
  dueCount: number;
  doneCount: number;
  archived: { id: string; title: string }[];
  hasRoutines: boolean;
};

type RoutineRow = {
  id: string;
  title: string;
  time_of_day: string;
  frequency: string;
  times_per_week: number | null;
  weekdays: number[] | null;
  is_active: boolean;
  routine_items: {
    id: string;
    title: string;
    sort_order: number;
    is_active: boolean;
    repeat_rule: string;
    repeat_every: number | null;
  }[];
};

// Completions older than this cannot change whether anything is due today (the longest
// rule is every 30th time), so the read stays bounded.
const HISTORY_DAYS = 400;

// The Routines page (and the Today dashboard's routines card): every active routine
// placed for `today` — due items grouped by time of day with done state, items not
// due today set aside, routines that don't run today as one line each — plus the day's
// due/done counts and the archived routines. `error` when the read failed.
export async function getRoutinesToday(
  supabase: Client,
  today: string,
  timeZone: string
): Promise<{ data: RoutinesToday; error: boolean }> {
  const since = format(subDays(parseISO(today), HISTORY_DAYS), "yyyy-MM-dd");
  const [routinesResult, completionsResult] = await Promise.all([
    supabase
      .from("routines")
      .select(
        "id, title, time_of_day, frequency, times_per_week, weekdays, is_active, routine_items(id, title, sort_order, is_active, repeat_rule, repeat_every)"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("routine_completions")
      .select("routine_item_id, period_start, completed_at")
      .gte("period_start", since),
  ]);

  const empty: RoutinesToday = {
    today,
    groups: [],
    notDue: [],
    notScheduled: [],
    dueCount: 0,
    doneCount: 0,
    archived: [],
    hasRoutines: false,
  };

  if (routinesResult.error || completionsResult.error) {
    logError("Load routines for today", routinesResult.error ?? completionsResult.error);
    return { data: empty, error: true };
  }

  const completionsByItem = new Map<string, { date: string; completedAt: string }[]>();
  for (const row of completionsResult.data ?? []) {
    const list = completionsByItem.get(row.routine_item_id) ?? [];
    list.push({ date: row.period_start, completedAt: row.completed_at });
    completionsByItem.set(row.routine_item_id, list);
  }

  const routines = (routinesResult.data ?? []) as unknown as RoutineRow[];
  const data: RoutinesToday = { ...empty, hasRoutines: routines.some((routine) => routine.is_active) };
  const grouped = new Map<TimeOfDay, TodayRoutine[]>();

  for (const routine of routines) {
    if (!routine.is_active) {
      data.archived.push({ id: routine.id, title: routine.title });
      continue;
    }
    const items = routine.routine_items.filter((item) => item.is_active).sort((a, b) => a.sort_order - b.sort_order);
    if (items.length === 0) continue;

    const schedule: RoutineSchedule = {
      frequency: routine.frequency as Frequency,
      timesPerWeek: routine.times_per_week,
      weekdays: routine.weekdays,
    };
    // Days the routine was done at all, across its items (archived ones included).
    const routineDates = [
      ...new Set(routine.routine_items.flatMap((item) => (completionsByItem.get(item.id) ?? []).map((c) => c.date))),
    ];

    if (!isScheduledToday(schedule, today, routineDates)) {
      const label =
        schedule.frequency === "times_per_week"
          ? `${sessionDaysThisWeek(routineDates, today)} of ${schedule.timesPerWeek} done this week`
          : nextRunLabel(schedule, today);
      data.notScheduled.push({ id: routine.id, title: routine.title, label });
      continue;
    }

    const due: TodayItem[] = [];
    const notDue: TodayItem[] = [];
    for (const item of items) {
      const completions = completionsByItem.get(item.id) ?? [];
      const doneToday = completions.find((c) => c.date === today);
      const lastDone = completions
        .map((c) => c.date)
        .filter((date) => date < today)
        .sort()
        .at(-1) ?? null;
      const repeat = { repeatRule: item.repeat_rule as RepeatRule, repeatEvery: item.repeat_every };
      const dueness = itemDueness(repeat, schedule.frequency, lastDone, routineDates, today);
      const rule = repeatLabel(repeat, schedule.frequency);
      const entry: TodayItem = {
        id: item.id,
        title: item.title,
        checked: Boolean(doneToday),
        detail: repeat.repeatRule !== "every_time" && lastDone ? `${rule} · last done ${formatShortDate(lastDone)}` : rule,
        doneAt: doneToday ? `Done ${formatClockTime(doneToday.completedAt, timeZone)}` : null,
        notDueLabel: dueness.due ? null : dueness.label,
      };
      (dueness.due ? due : notDue).push(entry);
    }

    const base = {
      id: routine.id,
      title: routine.title,
      frequencyLabel: frequencyLabel(schedule),
      weekProgress:
        schedule.frequency === "times_per_week"
          ? `${sessionDaysThisWeek(routineDates, today)} of ${schedule.timesPerWeek} this week`
          : null,
    };
    if (due.length > 0) {
      const timeOfDay = routine.time_of_day as TimeOfDay;
      grouped.set(timeOfDay, [...(grouped.get(timeOfDay) ?? []), { ...base, items: due }]);
      data.dueCount += due.length;
      data.doneCount += due.filter((item) => item.checked).length;
    }
    if (notDue.length > 0) data.notDue.push({ ...base, items: notDue });
  }

  data.groups = TIMES_OF_DAY.filter((timeOfDay) => grouped.has(timeOfDay)).map((timeOfDay) => ({
    timeOfDay,
    label: TIME_OF_DAY_LABELS[timeOfDay],
    routines: grouped.get(timeOfDay)!,
  }));

  return { data, error: false };
}
