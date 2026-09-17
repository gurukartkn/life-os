import { z } from "zod";

const dateStringSchema = z
  .string()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.");

export const todoInsertSchema = z.object({
  title: z.string().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
  description: z.string().max(2000, "Keep the description under 2000 characters.").optional(),
  due_date: dateStringSchema,
});

export const todoToggleSchema = z.object({
  id: z.string().uuid(),
  is_completed: z.boolean(),
});

export const todoDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type TodoInsertInput = z.infer<typeof todoInsertSchema>;
export type TodoToggleInput = z.infer<typeof todoToggleSchema>;
