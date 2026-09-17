"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todoInsertSchema, todoToggleSchema, todoDeleteSchema } from "@/lib/validations/todos";
import type { ActionResult } from "@/lib/types/action-result";

export async function createTodo(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = todoInsertSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    due_date: formData.get("due_date") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const { error } = await supabase.from("todos").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_date: parsed.data.due_date || null,
  });

  if (error) {
    console.error("createTodo failed:", error);
    return { success: false, error: "Couldn't add the todo. Try again." };
  }

  revalidatePath("/todos");
  return { success: true };
}

export async function toggleTodo(id: string, isCompleted: boolean): Promise<ActionResult> {
  const parsed = todoToggleSchema.safeParse({ id, is_completed: isCompleted });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("todos")
    .update({
      is_completed: parsed.data.is_completed,
      completed_at: parsed.data.is_completed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("toggleTodo failed:", error);
    return { success: false, error: "Couldn't update the todo. Try again." };
  }

  revalidatePath("/todos");
  return { success: true };
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const parsed = todoDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("deleteTodo failed:", error);
    return { success: false, error: "Couldn't delete the todo. Try again." };
  }

  revalidatePath("/todos");
  return { success: true };
}
