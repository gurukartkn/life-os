import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";
import { exerciseSummary } from "@/lib/fitness/labels";
import { frequencyLabel, TIME_OF_DAY_LABELS, type Frequency, type TimeOfDay } from "@/lib/routines/schedule";
import type { Database } from "@/lib/types/database";
import {
  GOAL_COLUMNS,
  goalFromRow,
  LINK_ITEM_TYPES,
  type Goal,
  type LinkItemType,
} from "@/lib/validations/goals";

// Read helpers for the Goals screens and Today's Goals card. Each takes the caller's
// Supabase client, so RLS scopes every read to their own rows. A failed read is logged
// with a static context (never a goal's or an item's title) and reported as `error`.
//
// Links are polymorphic (no foreign key from links to the item tables), so a link can
// outlive its item. Every count and list here goes through the item tables, so such an
// orphan is never shown or counted.

type Client = SupabaseClient<Database>;

export type GoalWithCount = Goal & { linkedCount: number };

// One linked (or linkable) item as the detail rows and the picker draw it.
export type GoalItem = {
  type: LinkItemType;
  id: string;
  title: string;
  // The muted line: "3 times a week · Anytime", "Cardio · Legs". Tasks leave it null —
  // their line depends on today (Due today / Overdue / a date), which the screen knows.
  detail: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  archived: boolean;
};

export type LinkedItems = Record<LinkItemType, GoalItem[]>;

type LinkRow = { source_id: string; target_type: string; target_id: string };

function isItemType(value: string): value is LinkItemType {
  return (LINK_ITEM_TYPES as readonly string[]).includes(value);
}

function emptyByType<T>(make: () => T): Record<LinkItemType, T> {
  return { task: make(), routine: make(), workout: make(), exercise: make() };
}

const ITEM_TABLES = { task: "tasks", routine: "routines", workout: "workouts", exercise: "exercises" } as const;

// Which of `ids` still exist (and are the caller's) for each item type: one id-only read
// per type that has any, in parallel.
async function existingItemIds(
  supabase: Client,
  idsByType: Record<LinkItemType, string[]>
): Promise<{ ids: Record<LinkItemType, Set<string>>; error: boolean }> {
  const types = LINK_ITEM_TYPES.filter((type) => idsByType[type].length > 0);
  const results = await Promise.all(
    types.map((type) => supabase.from(ITEM_TABLES[type]).select("id").in("id", idsByType[type]))
  );
  const ids = emptyByType(() => new Set<string>());
  let error = false;
  results.forEach((result, index) => {
    if (result.error) {
      logError(`Load linked ${types[index]} ids`, result.error);
      error = true;
      return;
    }
    for (const row of result.data ?? []) ids[types[index]].add(row.id);
  });
  return { ids, error };
}

// Linked-item counts per goal, orphans left out.
async function countLinkedItems(
  supabase: Client,
  links: LinkRow[]
): Promise<{ counts: Map<string, number>; error: boolean }> {
  const idsByType = emptyByType<string[]>(() => []);
  for (const link of links) {
    if (isItemType(link.target_type)) idsByType[link.target_type].push(link.target_id);
  }
  const { ids, error } = await existingItemIds(supabase, idsByType);
  const counts = new Map<string, number>();
  for (const link of links) {
    if (isItemType(link.target_type) && ids[link.target_type].has(link.target_id)) {
      counts.set(link.source_id, (counts.get(link.source_id) ?? 0) + 1);
    }
  }
  return { counts, error };
}

function goalLinks(supabase: Client, goalIds?: string[]) {
  const query = supabase.from("links").select("source_id, target_type, target_id").eq("source_type", "goal");
  return goalIds ? query.in("source_id", goalIds) : query;
}

// The Goals list: every goal with how many items it links to. Sorting is sortGoals()'s
// job (lib/goals.ts), since it needs the three statuses ordered differently.
export async function listGoals(supabase: Client): Promise<{ goals: GoalWithCount[]; error: boolean }> {
  const [goalsResult, linksResult] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS),
    goalLinks(supabase),
  ]);

  if (goalsResult.error || linksResult.error) {
    logError("Load goals", goalsResult.error ?? linksResult.error);
    return { goals: [], error: true };
  }

  const { counts, error } = await countLinkedItems(supabase, linksResult.data ?? []);
  if (error) return { goals: [], error: true };

  const goals = (goalsResult.data ?? []).map((row) => ({
    ...goalFromRow(row),
    linkedCount: counts.get(row.id) ?? 0,
  }));
  return { goals, error: false };
}

// Today's Goals card: up to three active goals, nearest target date first (undated last).
export async function getTodayGoals(supabase: Client): Promise<{ goals: GoalWithCount[]; error: boolean }> {
  const { data, error } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("status", "active")
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(3);

  if (error) {
    logError("Load today's goals", error);
    return { goals: [], error: true };
  }

  const rows = data ?? [];
  if (rows.length === 0) return { goals: [], error: false };

  const links = await goalLinks(
    supabase,
    rows.map((row) => row.id)
  );
  if (links.error) {
    logError("Load today's goal links", links.error);
    return { goals: [], error: true };
  }
  const counted = await countLinkedItems(supabase, links.data ?? []);
  if (counted.error) return { goals: [], error: true };

  return {
    goals: rows.map((row) => ({ ...goalFromRow(row), linkedCount: counted.counts.get(row.id) ?? 0 })),
    error: false,
  };
}

// ---- Items, by type ----------------------------------------------------------------

type TaskRow = { id: string; title: string; due_date: string | null; is_completed: boolean };
type RoutineRow = {
  id: string;
  title: string;
  frequency: string;
  times_per_week: number | null;
  weekdays: number[] | null;
  time_of_day: string;
  is_active: boolean;
};
type MuscleGroupLinks = { muscle_groups: { name: string } | null }[];
type WorkoutRow = {
  id: string;
  name: string;
  workout_exercises: { sort_order: number; exercises: { exercise_muscle_groups: MuscleGroupLinks } | null }[];
};
type ExerciseRow = {
  id: string;
  name: string;
  exercise_type: string;
  is_active: boolean;
  exercise_muscle_groups: MuscleGroupLinks;
};

const TASK_SELECT = "id, title, due_date, is_completed";
const ROUTINE_SELECT = "id, title, frequency, times_per_week, weekdays, time_of_day, is_active";
const WORKOUT_SELECT =
  "id, name, workout_exercises(sort_order, exercises(exercise_muscle_groups(muscle_groups(name))))";
const EXERCISE_SELECT = "id, name, exercise_type, is_active, exercise_muscle_groups(muscle_groups(name))";

function muscleGroupNames(links: MuscleGroupLinks): string[] {
  return links.flatMap((link) => (link.muscle_groups ? [link.muscle_groups.name] : []));
}

function taskItem(row: TaskRow): GoalItem {
  return {
    type: "task",
    id: row.id,
    title: row.title,
    detail: null,
    dueDate: row.due_date,
    isCompleted: row.is_completed,
    archived: false,
  };
}

function routineItem(row: RoutineRow): GoalItem {
  const schedule = frequencyLabel({
    frequency: row.frequency as Frequency,
    timesPerWeek: row.times_per_week,
    weekdays: row.weekdays,
  });
  const time = TIME_OF_DAY_LABELS[row.time_of_day as TimeOfDay] ?? "Anytime";
  return {
    type: "routine",
    id: row.id,
    title: row.title,
    detail: `${schedule} · ${time}`,
    dueDate: null,
    isCompleted: false,
    archived: !row.is_active,
  };
}

function workoutItem(row: WorkoutRow): GoalItem {
  const ordered = [...row.workout_exercises].sort((a, b) => a.sort_order - b.sort_order);
  const groups = Array.from(
    new Set(ordered.flatMap((we) => (we.exercises ? muscleGroupNames(we.exercises.exercise_muscle_groups) : [])))
  ).slice(0, 3);
  return {
    type: "workout",
    id: row.id,
    title: row.name,
    detail: groups.length > 0 ? groups.join(", ") : null,
    dueDate: null,
    isCompleted: false,
    archived: false,
  };
}

function exerciseItem(row: ExerciseRow): GoalItem {
  return {
    type: "exercise",
    id: row.id,
    title: row.name,
    detail: exerciseSummary(row.exercise_type, muscleGroupNames(row.exercise_muscle_groups)),
    dueDate: null,
    isCompleted: false,
    archived: !row.is_active,
  };
}

// Open tasks first, soonest due first, undated last.
function byDue(a: GoalItem, b: GoalItem): number {
  if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

function byTitle(a: GoalItem, b: GoalItem): number {
  return a.title.localeCompare(b.title);
}

type ItemsResult = { items: GoalItem[]; error: boolean };

function settle<T>(context: string, result: { data: unknown; error: unknown }, map: (row: T) => GoalItem): ItemsResult {
  if (result.error) {
    logError(context, result.error);
    return { items: [], error: true };
  }
  return { items: ((result.data ?? []) as T[]).map(map), error: false };
}

// The goal's linked items of each type, read by id — at most one query per type.
async function loadLinkedItems(
  supabase: Client,
  idsByType: Record<LinkItemType, string[]>
): Promise<{ items: LinkedItems; error: boolean }> {
  const none = Promise.resolve({ data: [], error: null });
  const [tasks, routines, workouts, exercises] = await Promise.all([
    idsByType.task.length ? supabase.from("tasks").select(TASK_SELECT).in("id", idsByType.task) : none,
    idsByType.routine.length ? supabase.from("routines").select(ROUTINE_SELECT).in("id", idsByType.routine) : none,
    idsByType.workout.length ? supabase.from("workouts").select(WORKOUT_SELECT).in("id", idsByType.workout) : none,
    idsByType.exercise.length
      ? supabase.from("exercises").select(EXERCISE_SELECT).in("id", idsByType.exercise)
      : none,
  ]);

  const results = {
    task: settle<TaskRow>("Load linked tasks", tasks, taskItem),
    routine: settle<RoutineRow>("Load linked routines", routines, routineItem),
    workout: settle<WorkoutRow>("Load linked workouts", workouts, workoutItem),
    exercise: settle<ExerciseRow>("Load linked exercises", exercises, exerciseItem),
  };

  return {
    items: {
      task: results.task.items.sort(byDue),
      routine: results.routine.items.sort(byTitle),
      workout: results.workout.items.sort(byTitle),
      exercise: results.exercise.items.sort(byTitle),
    },
    error: Object.values(results).some((result) => result.error),
  };
}

function linkIdsByType(links: LinkRow[]): Record<LinkItemType, string[]> {
  const idsByType = emptyByType<string[]>(() => []);
  for (const link of links) {
    if (isItemType(link.target_type)) idsByType[link.target_type].push(link.target_id);
  }
  return idsByType;
}

export type GoalDetail = { goal: Goal; linked: LinkedItems };

// The goal detail: the goal and its linked tasks, routines, workouts and exercises.
// `goal` is null when it does not exist or is not the caller's.
export async function getGoalDetail(
  supabase: Client,
  goalId: string
): Promise<{ detail: GoalDetail | null; error: boolean }> {
  const [goalResult, linksResult] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS).eq("id", goalId).maybeSingle(),
    goalLinks(supabase, [goalId]),
  ]);

  if (goalResult.error || linksResult.error) {
    logError("Load goal", goalResult.error ?? linksResult.error);
    return { detail: null, error: true };
  }
  if (!goalResult.data) return { detail: null, error: false };

  const { items, error } = await loadLinkedItems(supabase, linkIdsByType(linksResult.data ?? []));
  return { detail: { goal: goalFromRow(goalResult.data), linked: items }, error };
}

export type PickerItem = GoalItem & { linked: boolean };
export type LinkPicker = Record<LinkItemType, PickerItem[]>;

// What the Link pickers offer for one goal: open tasks (plus completed ones it already
// links to, so they can be unticked), active routines, every workout and active
// exercises — each flagged when the goal already links to it.
export async function getLinkPicker(
  supabase: Client,
  goalId: string
): Promise<{ picker: LinkPicker; error: boolean }> {
  const links = await goalLinks(supabase, [goalId]);
  if (links.error) {
    logError("Load goal links for the picker", links.error);
    return { picker: emptyByType(() => []), error: true };
  }
  const linked = linkIdsByType(links.data ?? []);
  const linkedTasks = linked.task;

  const tasksQuery = supabase.from("tasks").select(TASK_SELECT);
  const [tasks, routines, workouts, exercises] = await Promise.all([
    linkedTasks.length
      ? tasksQuery.or(`is_completed.eq.false,id.in.(${linkedTasks.join(",")})`)
      : tasksQuery.eq("is_completed", false),
    supabase.from("routines").select(ROUTINE_SELECT).eq("is_active", true),
    supabase.from("workouts").select(WORKOUT_SELECT),
    supabase.from("exercises").select(EXERCISE_SELECT).eq("is_active", true),
  ]);

  const results = {
    task: settle<TaskRow>("Load picker tasks", tasks, taskItem),
    routine: settle<RoutineRow>("Load picker routines", routines, routineItem),
    workout: settle<WorkoutRow>("Load picker workouts", workouts, workoutItem),
    exercise: settle<ExerciseRow>("Load picker exercises", exercises, exerciseItem),
  };

  const flag = (type: LinkItemType, items: GoalItem[]): PickerItem[] => {
    const ids = new Set(linked[type]);
    return items.map((item) => ({ ...item, linked: ids.has(item.id) }));
  };

  return {
    picker: {
      task: flag("task", results.task.items.sort(byDue)),
      routine: flag("routine", results.routine.items.sort(byTitle)),
      workout: flag("workout", results.workout.items.sort(byTitle)),
      exercise: flag("exercise", results.exercise.items.sort(byTitle)),
    },
    error: Object.values(results).some((result) => result.error),
  };
}
