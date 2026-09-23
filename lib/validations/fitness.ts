import { z } from "zod";

export const exerciseTypeSchema = z.enum(["weight_training", "cardio", "other"]);

export const exerciseArchiveSchema = z.object({ id: z.string().uuid() });

// Muscle groups and equipment are per-user catalogs (their own tables), tagged onto
// exercises by id. Names are trimmed; uniqueness ignoring case is enforced by the database.
const catalogNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(100, "Keep the name under 100 characters.");

export const muscleGroupSchema = z.object({
  name: catalogNameSchema,
  isActive: z.boolean().default(true),
});

export const equipmentSchema = z.object({
  name: catalogNameSchema,
  isActive: z.boolean().default(true),
});

export const catalogRenameSchema = z.object({ id: z.string().uuid(), name: catalogNameSchema });

export const catalogIdSchema = z.object({ id: z.string().uuid() });

export type MuscleGroupInput = z.input<typeof muscleGroupSchema>;
export type EquipmentInput = z.input<typeof equipmentSchema>;

const tagIdsSchema = z.array(z.string().uuid("Choose a valid option.")).max(50, "Choose up to 50.");

// The id-based exercise input, replacing the free-text muscle_groups / equipment
// fields above once the exercise screens move over to it.
export const exerciseCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
  exerciseType: exerciseTypeSchema,
  muscleGroupIds: tagIdsSchema,
  equipmentIds: tagIdsSchema,
});

export const exerciseUpdateSchema = exerciseCreateSchema.extend({ id: z.string().uuid() });

export type ExerciseCreateInput = z.infer<typeof exerciseCreateSchema>;
export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>;

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

const workoutItemSchema = z.object({
  // An existing workout_exercises row being kept; absent for a newly added one.
  id: z.string().uuid().optional(),
  exerciseId: z.string().uuid("Choose an exercise."),
  targetSets: z.number().int().min(1, "At least 1 set.").max(20, "Keep sets under 20.").optional(),
  targetReps: z.string().trim().max(30, "Keep target reps under 30 characters.").optional(),
});

// The full edited state of a workout: `items` is the whole ordered list, so its
// position is the sort order and any existing row left out of it is removed.
export const workoutUpdateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1, "Enter a name.").max(200, "Keep the name under 200 characters."),
    notes: z.string().trim().max(2000, "Keep notes under 2000 characters.").optional(),
    items: z.array(workoutItemSchema).min(1, "Add at least one exercise."),
  })
  .refine(
    ({ items }) => {
      const ids = items.flatMap((item) => (item.id ? [item.id] : []));
      return new Set(ids).size === ids.length;
    },
    { message: "Each exercise row can appear only once.", path: ["items"] }
  );

export type WorkoutUpdateInput = z.infer<typeof workoutUpdateSchema>;

export const workoutLogFinishSchema = z.object({ id: z.string().uuid() });

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
