import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveMuscleGroup,
  createMuscleGroup,
  createMuscleGroupInline,
  deleteMuscleGroup,
  renameMuscleGroup,
  restoreMuscleGroup,
} from "@/actions/muscle-groups";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const ID = "550e8400-e29b-41d4-a716-446655440000";
const DUPLICATE = { code: "23505", message: "duplicate key value violates unique constraint" };
const IN_USE = { code: "23503", message: "violates foreign key constraint" };

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

function builderAt(index: number) {
  return supabase.from.mock.results[index].value;
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createMuscleGroup", () => {
  it("trims the name, rejects an empty one and never calls Supabase for it", async () => {
    const result = await createMuscleGroup({ name: "   " });

    expect(result).toEqual({ success: false, error: "Enter a name." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the trimmed name for the current user and returns the item", async () => {
    const { revalidatePath } = await import("next/cache");
    queue(queryResult({ id: ID, name: "Chest", is_active: true }));

    const result = await createMuscleGroup({ name: "  Chest  " });

    expect(supabase.from).toHaveBeenCalledWith("muscle_groups");
    expect(builderAt(0).insert).toHaveBeenCalledWith({ user_id: "user-1", name: "Chest", is_active: true });
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
    expect(result).toEqual({ success: true, data: { id: ID, name: "Chest", isActive: true } });
  });

  it("returns a typed duplicate_name error when the name already exists ignoring case", async () => {
    queue(queryResult(null, DUPLICATE));

    const result = await createMuscleGroup({ name: "chest" });

    expect(result).toEqual({
      success: false,
      error: "A muscle group with that name already exists.",
      code: "duplicate_name",
    });
  });

  it("maps any other database error to a friendly message", async () => {
    queue(queryResult(null, { code: "XX000", message: "db exploded" }));

    const result = await createMuscleGroup({ name: "Chest" });

    expect(result).toEqual({ success: false, error: "Couldn't add the muscle group. Try again." });
  });
});

describe("renameMuscleGroup", () => {
  it("updates the name and updated_at", async () => {
    queue(queryResult({ id: ID, name: "Upper chest", is_active: true }));

    const result = await renameMuscleGroup(ID, " Upper chest ");

    expect(builderAt(0).update).toHaveBeenCalledWith({
      name: "Upper chest",
      updated_at: expect.any(String),
    });
    expect(builderAt(0).eq).toHaveBeenCalledWith("id", ID);
    expect(result).toEqual({ success: true, data: { id: ID, name: "Upper chest", isActive: true } });
  });

  it("returns a typed duplicate_name error for a case-only clash with another item", async () => {
    queue(queryResult(null, DUPLICATE));

    const result = await renameMuscleGroup(ID, "BACK");

    expect(result).toMatchObject({ success: false, code: "duplicate_name" });
  });

  it("reports an item that no longer exists", async () => {
    queue(queryResult(null, null));

    const result = await renameMuscleGroup(ID, "Back");

    expect(result).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("archiveMuscleGroup and restoreMuscleGroup", () => {
  it("archive flips is_active off and keeps the row", async () => {
    queue(queryResult({ id: ID, name: "Chest", is_active: false }));

    const result = await archiveMuscleGroup(ID);

    expect(builderAt(0).update).toHaveBeenCalledWith({ is_active: false, updated_at: expect.any(String) });
    expect(builderAt(0).delete).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: { id: ID, name: "Chest", isActive: false } });
  });

  it("restore flips is_active back on", async () => {
    queue(queryResult({ id: ID, name: "Chest", is_active: true }));

    const result = await restoreMuscleGroup(ID);

    expect(builderAt(0).update).toHaveBeenCalledWith({ is_active: true, updated_at: expect.any(String) });
    expect(result).toMatchObject({ success: true, data: { isActive: true } });
  });
});

describe("deleteMuscleGroup", () => {
  it("is blocked while any exercise links to the item, and tells the UI to archive instead", async () => {
    queue(queryResult(null, null, 2));

    const result = await deleteMuscleGroup(ID);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("exercise_muscle_groups");
    expect(builderAt(0).eq).toHaveBeenCalledWith("muscle_group_id", ID);
    expect(result).toEqual({
      success: false,
      error: "Some exercises still use this muscle group. Archive it instead.",
      code: "in_use",
    });
  });

  it("deletes once nothing links to it", async () => {
    const { revalidatePath } = await import("next/cache");
    queue(queryResult(null, null, 0), queryResult({ id: ID }));

    const result = await deleteMuscleGroup(ID);

    expect(supabase.from).toHaveBeenNthCalledWith(2, "muscle_groups");
    expect(builderAt(1).delete).toHaveBeenCalled();
    expect(builderAt(1).eq).toHaveBeenCalledWith("id", ID);
    expect(revalidatePath).toHaveBeenCalledWith("/fitness");
    expect(result).toEqual({ success: true });
  });

  it("still answers in_use when a link appears between the check and the delete", async () => {
    queue(queryResult(null, null, 0), queryResult(null, IN_USE));

    const result = await deleteMuscleGroup(ID);

    expect(result).toMatchObject({ success: false, code: "in_use" });
  });
});

describe("createMuscleGroupInline", () => {
  it("creates a new item like a plain create", async () => {
    queue(queryResult({ id: ID, name: "Calves", is_active: true }));

    const result = await createMuscleGroupInline({ name: "Calves" });

    expect(result).toEqual({ success: true, data: { id: ID, name: "Calves", isActive: true } });
  });

  it("returns the existing item, not an error, for a case-only duplicate", async () => {
    queue(
      queryResult(null, DUPLICATE),
      queryResult([
        { id: "another-id", name: "Back", is_active: true },
        { id: ID, name: "Chest", is_active: true },
      ])
    );

    const result = await createMuscleGroupInline({ name: "cHeSt" });

    expect(result).toEqual({ success: true, data: { id: ID, name: "Chest", isActive: true } });
  });

  it("returns an existing archived item as it is, still archived", async () => {
    queue(queryResult(null, DUPLICATE), queryResult([{ id: ID, name: "Chest", is_active: false }]));

    const result = await createMuscleGroupInline({ name: "chest" });

    expect(result).toEqual({ success: true, data: { id: ID, name: "Chest", isActive: false } });
  });

  it("still rejects an empty name", async () => {
    const result = await createMuscleGroupInline({ name: " " });

    expect(result).toEqual({ success: false, error: "Enter a name." });
  });
});
