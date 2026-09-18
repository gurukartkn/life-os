import { z } from "zod";

export const exerciseTypeSchema = z.enum(["weight_training", "cardio", "other"]);

export const exerciseInsertSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
  exercise_type: exerciseTypeSchema,
  muscle_groups: z.string().max(200, "Keep muscle groups under 200 characters.").optional(),
  equipment: z.string().max(200, "Keep equipment under 200 characters.").optional(),
});

export type ExerciseInsertInput = z.infer<typeof exerciseInsertSchema>;

export const exerciseArchiveSchema = z.object({ id: z.string().uuid() });

const workoutExerciseSchema = z.object({
  exercise_id: z.string().uuid("Choose an exercise."),
  target_sets: z.number().int().min(1, "At least 1 set.").max(20, "Keep sets under 20."),
  target_reps: z.string().max(30, "Keep target reps under 30 characters.").optional(),
});

export const createWorkoutSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
  notes: z.string().max(2000, "Keep notes under 2000 characters.").optional(),
  exercises: z.array(workoutExerciseSchema).min(1, "Add at least one exercise."),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const workoutDeleteSchema = z.object({ id: z.string().uuid() });

export const startWorkoutLogSchema = z.object({
  workout_id: z.string().uuid(),
});

export const setLogSaveSchema = z
  .object({
    workout_log_id: z.string().uuid(),
    exercise_id: z.string().uuid(),
    set_number: z.number().int().min(1).max(50),
    weight: z.number().min(0).max(2000).optional(),
    reps: z.number().int().min(0).max(1000).optional(),
    duration_seconds: z.number().int().min(0).max(36000).optional(),
  })
  .refine((value) => value.reps !== undefined || value.duration_seconds !== undefined, {
    message: "Enter reps or a duration.",
    path: ["reps"],
  });

export type SetLogSaveInput = z.infer<typeof setLogSaveSchema>;

export const setLogDeleteSchema = z.object({ id: z.string().uuid() });
