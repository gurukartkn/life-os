import { describe, expect, it } from "vitest";
import {
  equipmentSchema,
  exerciseCreateSchema,
  exerciseUpdateSchema,
  muscleGroupSchema,
  workoutUpdateSchema,
} from "./fitness";

const ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_ID = "5b6f3d40-1111-4a11-8b11-111111111111";

describe("muscleGroupSchema and equipmentSchema", () => {
  it.each([
    ["muscleGroupSchema", muscleGroupSchema],
    ["equipmentSchema", equipmentSchema],
  ])("%s trims the name, defaults isActive to true and rejects a blank name", (_name, schema) => {
    expect(schema.parse({ name: "  Chest  " })).toEqual({ name: "Chest", isActive: true });
    expect(schema.parse({ name: "Chest", isActive: false })).toEqual({ name: "Chest", isActive: false });
    expect(schema.safeParse({ name: "   " }).error?.issues[0]?.message).toBe("Enter a name.");
  });
});

describe("exerciseCreateSchema and exerciseUpdateSchema", () => {
  const base = { name: " Bench ", exerciseType: "weight_training", muscleGroupIds: [], equipmentIds: [] };

  it("takes id arrays that may be empty, and trims the name", () => {
    expect(exerciseCreateSchema.parse(base)).toEqual({ ...base, name: "Bench" });
    expect(exerciseCreateSchema.parse({ ...base, muscleGroupIds: [ID], equipmentIds: [OTHER_ID] })).toMatchObject({
      muscleGroupIds: [ID],
      equipmentIds: [OTHER_ID],
    });
  });

  it("rejects ids that are not uuids and the old free-text form", () => {
    expect(exerciseCreateSchema.safeParse({ ...base, muscleGroupIds: ["chest"] }).success).toBe(false);
    expect(exerciseCreateSchema.safeParse({ ...base, muscleGroupIds: "chest, triceps" }).success).toBe(false);
  });

  it("the update schema also needs the exercise id", () => {
    expect(exerciseUpdateSchema.safeParse(base).success).toBe(false);
    expect(exerciseUpdateSchema.safeParse({ ...base, id: ID }).success).toBe(true);
  });
});

describe("workoutUpdateSchema", () => {
  const item = { exerciseId: ID };

  it("takes an ordered list of items with optional row id and targets", () => {
    const parsed = workoutUpdateSchema.parse({
      id: ID,
      name: " Push ",
      notes: " heavy ",
      items: [{ id: OTHER_ID, exerciseId: ID, targetSets: 3, targetReps: " 8-10 " }, item],
    });

    expect(parsed.name).toBe("Push");
    expect(parsed.notes).toBe("heavy");
    expect(parsed.items).toEqual([{ id: OTHER_ID, exerciseId: ID, targetSets: 3, targetReps: "8-10" }, item]);
  });

  it("needs a name and at least one item, and no repeated row ids", () => {
    expect(workoutUpdateSchema.safeParse({ id: ID, name: " ", items: [item] }).success).toBe(false);
    expect(workoutUpdateSchema.safeParse({ id: ID, name: "Push", items: [] }).success).toBe(false);
    expect(
      workoutUpdateSchema.safeParse({
        id: ID,
        name: "Push",
        items: [
          { id: OTHER_ID, exerciseId: ID },
          { id: OTHER_ID, exerciseId: ID },
        ],
      }).success
    ).toBe(false);
  });

  it("allows the same exercise on several rows", () => {
    expect(workoutUpdateSchema.safeParse({ id: ID, name: "Push", items: [item, item] }).success).toBe(true);
  });
});
