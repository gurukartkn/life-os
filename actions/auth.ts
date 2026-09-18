"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { logError, mapAuthError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types/action-result";

export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logError("login", error);
    return { success: false, error: mapAuthError(error) };
  }

  redirect("/todos");
}

export async function signup(
  _prevState: ActionResult<string>,
  formData: FormData
): Promise<ActionResult<string>> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    logError("signup", error);
    return { success: false, error: mapAuthError(error) };
  }

  if (data.session) {
    redirect("/todos");
  }

  return {
    success: true,
    data: "Check your email to confirm your account, then log in.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
