"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  taskDeleteSchema,
  taskInsertSchema,
  taskToggleSchema,
  taskUpdateSchema,
} from "@/lib/validations/tasks";
import { logError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

export async function createTask(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = taskInsertSchema.safeParse({
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

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_date: parsed.data.due_date || null,
  });

  if (error) {
    logError("createTask", error);
    return { success: false, error: "Couldn't add the task. Try again." };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function updateTask(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = taskUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    due_date: formData.get("due_date") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title: parsed.data.title, due_date: parsed.data.due_date || null })
    .eq("id", parsed.data.id);

  if (error) {
    logError("updateTask", error);
    return { success: false, error: "Couldn't save the task. Try again." };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function toggleTask(id: string, isCompleted: boolean): Promise<ActionResult> {
  const parsed = taskToggleSchema.safeParse({ id, is_completed: isCompleted });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      is_completed: parsed.data.is_completed,
      completed_at: parsed.data.is_completed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    logError("toggleTask", error);
    return { success: false, error: "Couldn't update the task. Try again." };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const parsed = taskDeleteSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", parsed.data.id);

  if (error) {
    logError("deleteTask", error);
    return { success: false, error: "Couldn't delete the task. Try again." };
  }

  revalidatePath("/tasks");
  return { success: true };
}
