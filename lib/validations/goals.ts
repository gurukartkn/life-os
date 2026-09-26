import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/types/database";

// Stored values; the screens call them Active, Achieved and Dropped.
export const GOAL_STATUSES = ["active", "achieved", "dropped"] as const;
export const goalStatusSchema = z.enum(GOAL_STATUSES);
export type GoalStatus = z.infer<typeof goalStatusSchema>;

// A local calendar date ("YYYY-MM-DD", in the user's timezone). A target in the past is
// allowed: the goal then reads as overdue. An empty field means no date.
const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const goalInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
  targetDate: localDateSchema,
  status: goalStatusSchema,
});

export type GoalInput = z.input<typeof goalInputSchema>;
export type GoalValues = z.output<typeof goalInputSchema>;

export const goalUpdateSchema = goalInputSchema.extend({ id: z.uuid() });

export const goalIdSchema = z.uuid();

// What a goal links to. A goal is always the link's source; these are the targets.
export const LINK_ITEM_TYPES = ["task", "routine", "workout", "exercise"] as const;
export const linkItemTypeSchema = z.enum(LINK_ITEM_TYPES);
export type LinkItemType = z.infer<typeof linkItemTypeSchema>;

export const linkTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task"), id: z.uuid() }),
  z.object({ type: z.literal("routine"), id: z.uuid() }),
  z.object({ type: z.literal("workout"), id: z.uuid() }),
  z.object({ type: z.literal("exercise"), id: z.uuid() }),
]);
export type LinkTarget = z.infer<typeof linkTargetSchema>;

export const setLinksSchema = z.object({
  goalId: z.uuid(),
  type: linkItemTypeSchema,
  ids: z.array(z.uuid()).max(500),
});

// The one place goals move between the app's camelCase and the table's snake_case.
export type Goal = {
  id: string;
  title: string;
  targetDate: string | null;
  status: GoalStatus;
  achievedOn: string | null;
  updatedAt: string;
};

export type GoalRow = Pick<Tables<"goals">, "id" | "title" | "target_date" | "status" | "achieved_on" | "updated_at">;

export const GOAL_COLUMNS = "id, title, target_date, status, achieved_on, updated_at";

// Rows written before the expand migration may still say completed / abandoned / null.
export function toGoalStatus(value: string | null): GoalStatus {
  if (value === "achieved" || value === "completed") return "achieved";
  if (value === "dropped" || value === "abandoned") return "dropped";
  return "active";
}

export function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    targetDate: row.target_date,
    status: toGoalStatus(row.status),
    achievedOn: row.achieved_on,
    updatedAt: row.updated_at,
  };
}

export function goalToRow(
  values: GoalValues,
  achievedOn: string | null
): Pick<TablesInsert<"goals">, "title" | "target_date" | "status" | "achieved_on"> {
  return {
    title: values.title,
    target_date: values.targetDate ?? null,
    status: values.status,
    achieved_on: achievedOn,
  };
}
