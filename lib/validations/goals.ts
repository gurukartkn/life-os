import { z } from "zod";

export const goalInsertSchema = z.object({
  title: z.string().min(1, "Enter a title.").max(200, "Keep the title under 200 characters."),
  target_date: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date."),
});

export type GoalInsertInput = z.infer<typeof goalInsertSchema>;
