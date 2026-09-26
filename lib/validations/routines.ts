import { z } from "zod";

export const timeOfDaySchema = z.enum(["morning", "afternoon", "evening", "anytime"]);
export const frequencySchema = z.enum(["daily", "times_per_week", "specific_days"]);
export const repeatRuleSchema = z.enum(["every_time", "every_nth", "weekly"]);

const titleSchema = z.string().trim().min(1, "Enter a name.").max(200, "Keep the name under 200 characters.");

const routineItemFormSchema = z
  .object({
    // An existing routine_items row being kept; absent for a new one.
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Name every item.").max(200, "Keep item names under 200 characters."),
    repeatRule: repeatRuleSchema,
    repeatEvery: z.number().int().min(2, "Every Nth takes 2 to 30.").max(30, "Every Nth takes 2 to 30.").nullable(),
    isActive: z.boolean(),
  })
  .transform((item) => ({ ...item, repeatEvery: item.repeatRule === "every_nth" ? item.repeatEvery ?? 2 : null }));

// The routine form (Routines "Routine form" board): details, schedule and the whole
// ordered item list — archived items included, flagged — so its position is the sort
// order and an existing item left out of it is removed. Seven specific days is Daily.
export const routineFormSchema = z
  .object({
    title: titleSchema,
    timeOfDay: timeOfDaySchema,
    frequency: frequencySchema,
    timesPerWeek: z.number().int().min(1, "Pick 1 to 6.").max(6, "Pick 1 to 6.").nullable(),
    weekdays: z.array(z.number().int().min(1).max(7)).nullable(),
    items: z.array(routineItemFormSchema),
  })
  .superRefine((value, ctx) => {
    if (!value.items.some((item) => item.isActive)) {
      ctx.addIssue({ code: "custom", message: "Add at least one item.", path: ["items"] });
    }
    if (value.frequency === "specific_days" && !value.weekdays?.length) {
      ctx.addIssue({ code: "custom", message: "Pick at least one day.", path: ["weekdays"] });
    }
    const ids = value.items.flatMap((item) => (item.id ? [item.id] : []));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Each item can appear only once.", path: ["items"] });
    }
  })
  .transform((value) => {
    const days = [...new Set(value.weekdays ?? [])].sort();
    if (value.frequency === "specific_days" && days.length === 7) {
      return { ...value, frequency: "daily" as const, timesPerWeek: null, weekdays: null };
    }
    return {
      ...value,
      timesPerWeek: value.frequency === "times_per_week" ? value.timesPerWeek ?? 1 : null,
      weekdays: value.frequency === "specific_days" ? days : null,
    };
  });

export type RoutineFormInput = z.input<typeof routineFormSchema>;
export type RoutineFormValues = z.output<typeof routineFormSchema>;

export const routineUpdateSchema = z.object({ id: z.string().uuid() });

export const routineActiveSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export const routineCompletionToggleSchema = z.object({
  routine_item_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  is_checking: z.boolean(),
});

export type RoutineCompletionToggleInput = z.infer<typeof routineCompletionToggleSchema>;
