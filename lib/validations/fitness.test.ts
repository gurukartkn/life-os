import { describe, expect, it } from "vitest";
import {
  createWorkoutSchema,
  exerciseInsertSchema,
  setLogSaveSchema,
  startWorkoutLogSchema,
  workoutDeleteSchema,
} from "./fitness";

describe("exerciseInsertSchema", () => {
  it("accepts a name and type with no other fields", () => {
    const result = exerciseInsertSchema.safeParse({
      name: "Bench Press",
      exercise_type: "weight_training",
    });
    expect(result.success).toBe(true);
  });

  it("accepts muscle groups and equipment", () => {
    const result = exerciseInsertSchema.safeParse({
      name: "Bench Press",
      exercise_type: "weight_training",
      muscle_groups: "Chest, Triceps",
      equipment: "Barbell, Bench",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = exerciseInsertSchema.safeParse({ name: "", exercise_type: "cardio" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid exercise type", () => {
    const result = exerciseInsertSchema.safeParse({ name: "Bench Press", exercise_type: "yoga" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing exercise type", () => {
    const result = exerciseInsertSchema.safeParse({ name: "Bench Press" });
    expect(result.success).toBe(false);
  });
});

describe("workoutDeleteSchema", () => {
  it("accepts a valid id", () => {
    const result = workoutDeleteSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = workoutDeleteSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("createWorkoutSchema", () => {
  const exercise = {
    exercise_id: "550e8400-e29b-41d4-a716-446655440000",
    target_sets: 3,
    target_reps: "8-12",
  };

  it("accepts a name with at least one exercise", () => {
    const result = createWorkoutSchema.safeParse({ name: "Push Workout A", exercises: [exercise] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty exercise list", () => {
    const result = createWorkoutSchema.safeParse({ name: "Push Workout A", exercises: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an exercise with no exercise_id chosen", () => {
    const result = createWorkoutSchema.safeParse({
      name: "Push Workout A",
      exercises: [{ ...exercise, exercise_id: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects target_sets over 20", () => {
    const result = createWorkoutSchema.safeParse({
      name: "Push Workout A",
      exercises: [{ ...exercise, target_sets: 21 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("startWorkoutLogSchema", () => {
  it("accepts a valid workout id", () => {
    const result = startWorkoutLogSchema.safeParse({
      workout_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid workout id", () => {
    const result = startWorkoutLogSchema.safeParse({ workout_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("setLogSaveSchema", () => {
  const base = {
    workout_log_id: "550e8400-e29b-41d4-a716-446655440000",
    exercise_id: "550e8400-e29b-41d4-a716-446655440001",
    set_number: 1,
  };

  it("accepts weight and reps", () => {
    const result = setLogSaveSchema.safeParse({ ...base, weight: 135, reps: 10 });
    expect(result.success).toBe(true);
  });

  it("accepts a duration with no weight or reps", () => {
    const result = setLogSaveSchema.safeParse({ ...base, duration_seconds: 60 });
    expect(result.success).toBe(true);
  });

  it("rejects a set with neither reps nor duration", () => {
    const result = setLogSaveSchema.safeParse({ ...base, weight: 135 });
    expect(result.success).toBe(false);
  });
});
