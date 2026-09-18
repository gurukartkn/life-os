import { z } from "zod";

export const linkWorkoutLogToGoalSchema = z.object({
  workout_log_id: z.string().uuid(),
  goal_id: z.string().uuid(),
});

export type LinkWorkoutLogToGoalInput = z.infer<typeof linkWorkoutLogToGoalSchema>;

export const unlinkGoalSchema = z.object({ id: z.string().uuid() });
