import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEquipment,
  createEquipmentInline,
  deleteEquipment,
  renameEquipment,
} from "@/actions/equipment";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

// Equipment shares its implementation with muscle groups (lib/fitness/catalog.ts, covered in
// muscle-groups.test.ts); these check that it is wired to its own tables and wording.

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const ID = "550e8400-e29b-41d4-a716-446655440000";
const DUPLICATE = { code: "23505", message: "duplicate key value violates unique constraint" };

let supabase: SupabaseMock;

function queue(...results: ReturnType<typeof queryResult>[]) {
  for (const result of results) supabase.from.mockReturnValueOnce(makeQueryBuilder(result));
}

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("equipment actions", () => {
  it("creates in the equipment table and rejects a case-only duplicate", async () => {
    queue(queryResult({ id: ID, name: "Barbell", is_active: true }), queryResult(null, DUPLICATE));

    const created = await createEquipment({ name: "Barbell" });
    const duplicate = await createEquipment({ name: "barbell" });

    expect(supabase.from).toHaveBeenCalledWith("equipment");
    expect(created).toEqual({ success: true, data: { id: ID, name: "Barbell", isActive: true } });
    expect(duplicate).toEqual({
      success: false,
      error: "That equipment already exists.",
      code: "duplicate_name",
    });
  });

  it("rejects a case-only duplicate on rename", async () => {
    queue(queryResult(null, DUPLICATE));

    expect(await renameEquipment(ID, "BENCH")).toMatchObject({ success: false, code: "duplicate_name" });
  });

  it("blocks delete while an exercise links to it, checking exercise_equipment", async () => {
    queue(queryResult(null, null, 1));

    const result = await deleteEquipment(ID);

    expect(supabase.from).toHaveBeenCalledWith("exercise_equipment");
    expect(supabase.from.mock.results[0].value.eq).toHaveBeenCalledWith("equipment_id", ID);
    expect(result).toMatchObject({ success: false, code: "in_use" });
  });

  it("returns the existing item for a case-only duplicate on inline create", async () => {
    queue(queryResult(null, DUPLICATE), queryResult([{ id: ID, name: "Barbell", is_active: true }]));

    const result = await createEquipmentInline({ name: "BARBELL" });

    expect(result).toEqual({ success: true, data: { id: ID, name: "Barbell", isActive: true } });
  });
});
