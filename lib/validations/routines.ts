import { z } from "zod";

export const routineCadenceSchema = z.enum(["daily", "weekly"]);

const routineItemInputSchema = z.object({
  title: z.string().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
});

export const createRoutineSchema = z.object({
  title: z.string().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
  cadence: routineCadenceSchema,
  items: z.array(routineItemInputSchema).min(1, "Add at least one item."),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

export const routineDeleteSchema = z.object({ id: z.string().uuid() });

export const routineItemInsertSchema = z.object({
  routine_id: z.string().uuid(),
  title: z.string().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
});

export type RoutineItemInsertInput = z.infer<typeof routineItemInsertSchema>;

export const routineItemArchiveSchema = z.object({ id: z.string().uuid() });

export const routineCompletionToggleSchema = z.object({
  routine_item_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  is_checking: z.boolean(),
});

export type RoutineCompletionToggleInput = z.infer<typeof routineCompletionToggleSchema>;
