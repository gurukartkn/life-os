import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTodo, deleteTodo, toggleTodo } from "@/actions/todos";
import { createClient } from "@/lib/supabase/server";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("createTodo", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await createTodo({ success: false }, formData({ title: "" }));

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createTodo({ success: false }, formData({ title: "Buy groceries" }));

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the todo for the current user and revalidates /todos", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createTodo({ success: false }, formData({ title: "Buy groceries" }));

    expect(supabase.from).toHaveBeenCalledWith("todos");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Buy groceries",
      description: null,
      due_date: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createTodo({ success: false }, formData({ title: "Buy groceries" }));

    expect(result).toEqual({ success: false, error: "Couldn't add the todo. Try again." });
  });
});

describe("toggleTodo", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await toggleTodo("not-a-uuid", true);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks the todo completed with a timestamp", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await toggleTodo(VALID_ID, true);

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: true, completed_at: expect.any(String) })
    );
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(result).toEqual({ success: true });
  });

  it("clears completed_at when unchecking", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await toggleTodo(VALID_ID, false);

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ is_completed: false, completed_at: null });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await toggleTodo(VALID_ID, true);

    expect(result).toEqual({ success: false, error: "Couldn't update the todo. Try again." });
  });
});

describe("deleteTodo", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await deleteTodo("not-a-uuid");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the todo by id and revalidates /todos", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await deleteTodo(VALID_ID);

    const builder = supabase.from.mock.results[0].value;
    expect(supabase.from).toHaveBeenCalledWith("todos");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/todos");
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteTodo(VALID_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the todo. Try again." });
  });
});
