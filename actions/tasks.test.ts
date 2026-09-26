import { beforeEach, describe, expect, it, vi } from "vitest";
import { format, subDays } from "date-fns";
import { createTask, deleteTask, toggleTask, updateTask } from "@/actions/tasks";
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

describe("createTask", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await createTask({ success: false }, formData({ title: "" }));

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires the user to be logged in", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createTask({ success: false }, formData({ title: "Buy groceries" }));

    expect(result).toEqual({ success: false, error: "You need to be logged in." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("inserts the task for the current user and revalidates /tasks", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createTask({ success: false }, formData({ title: "Buy groceries" }));

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Buy groceries",
      description: null,
      due_date: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    expect(result).toEqual({ success: true });
  });

  it("saves a task dated yesterday", async () => {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await createTask(
      { success: false },
      formData({ title: "Renew passport", due_date: yesterday })
    );

    const builder = supabase.from.mock.results[0].value;
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Renew passport",
      description: null,
      due_date: yesterday,
    });
    expect(result).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await createTask({ success: false }, formData({ title: "Buy groceries" }));

    expect(result).toEqual({ success: false, error: "Couldn't add the task. Try again." });
  });
});

describe("updateTask", () => {
  it("returns a validation error and never calls Supabase when the title is empty", async () => {
    const result = await updateTask({ success: false }, formData({ id: VALID_ID, title: "" }));

    expect(result).toEqual({ success: false, error: "Enter a title." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an invalid id without calling Supabase", async () => {
    const result = await updateTask({ success: false }, formData({ id: "nope", title: "Renew passport" }));

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("saves the title and due date and revalidates /tasks", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await updateTask(
      { success: false },
      formData({ id: VALID_ID, title: "Renew passport", due_date: "2026-10-02" })
    );

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ title: "Renew passport", due_date: "2026-10-02" });
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    expect(result).toEqual({ success: true });
  });

  it("clears the due date when none is sent", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await updateTask({ success: false }, formData({ id: VALID_ID, title: "Renew passport" }));

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ title: "Renew passport", due_date: null });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await updateTask({ success: false }, formData({ id: VALID_ID, title: "Renew passport" }));

    expect(result).toEqual({ success: false, error: "Couldn't save the task. Try again." });
  });
});

describe("toggleTask", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await toggleTask("not-a-uuid", true);

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks the task completed with a timestamp", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await toggleTask(VALID_ID, true);

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_completed: true, completed_at: expect.any(String) })
    );
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    expect(result).toEqual({ success: true });
  });

  it("clears completed_at when unchecking", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    await toggleTask(VALID_ID, false);

    const builder = supabase.from.mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith({ is_completed: false, completed_at: null });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await toggleTask(VALID_ID, true);

    expect(result).toEqual({ success: false, error: "Couldn't update the task. Try again." });
  });
});

describe("deleteTask", () => {
  it("rejects an invalid id without calling Supabase", async () => {
    const result = await deleteTask("not-a-uuid");

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes the task by id, then the links to it, and revalidates /tasks and /goals", async () => {
    const { revalidatePath } = await import("next/cache");
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)));

    const result = await deleteTask(VALID_ID);

    expect(supabase.from.mock.calls.map((call) => call[0])).toEqual(["tasks", "links"]);
    const builder = supabase.from.mock.results[0].value;
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", VALID_ID);
    const links = supabase.from.mock.results[1].value;
    expect(links.delete).toHaveBeenCalled();
    expect(links.eq.mock.calls).toEqual([
      ["target_type", "task"],
      ["target_id", VALID_ID],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/tasks");
    expect(revalidatePath).toHaveBeenCalledWith("/goals", "layout");
    expect(result).toEqual({ success: true });
  });

  it("still reports the task deleted when the link clean-up fails", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, null)))
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    expect(await deleteTask(VALID_ID)).toEqual({ success: true });
  });

  it("maps a Supabase error to a friendly message", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "db exploded" })));

    const result = await deleteTask(VALID_ID);

    expect(result).toEqual({ success: false, error: "Couldn't delete the task. Try again." });
  });
});
