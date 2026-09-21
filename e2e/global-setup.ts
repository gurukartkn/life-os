import { createClient } from "@supabase/supabase-js";
import { emptyAccountEmail, loadEnvLocal } from "./load-env";

// Runs once before the Playwright suite. Ensures the dedicated e2e test
// accounts exist against the dev Supabase project (email confirmations are
// disabled there, so signUp grants a session immediately — no service-role
// admin API needed) and that each starts with no leftover data from a
// previous run. There are two: the main account, and a second one that specs
// use to check the "no data yet" state (see emptyAccountEmail()).
//
// Cleanup deletes only "parent" rows per user — workout_logs, workouts,
// routines — since every child table's FK is `on delete cascade`
// (supabase/migrations/20260917202812_initial_schema.sql), e.g. deleting a
// workout cascades its workout_exercises, deleting a routine cascades its
// routine_items and routine_completions. exercises must be deleted after
// workouts/workout_logs, since workout_exercises/set_logs reference it with
// `on delete restrict`.
export default async function globalSetup() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    throw new Error(
      "e2e/global-setup.ts: missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_EMAIL, or E2E_PASSWORD in .env.local"
    );
  }

  for (const accountEmail of [email, emptyAccountEmail()]) {
    await provisionAndClear(url, anonKey, accountEmail, password);
  }
}

async function provisionAndClear(url: string, anonKey: string, email: string, password: string) {
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try signing in first (the common case — the account already exists from
  // a previous run) so we only ever call signUp() the one time the account
  // doesn't exist yet, since signUp() counts against Supabase's email rate
  // limit even when email confirmations are disabled.
  let signIn = await supabase.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    const alreadyExists =
      signUpError?.code === "user_already_exists" || signUpError?.code === "email_exists";
    if (signUpError && !alreadyExists) {
      throw new Error(`e2e/global-setup.ts: failed to create test user: ${signUpError.message}`);
    }
    signIn = await supabase.auth.signInWithPassword({ email, password });
  }

  if (signIn.error || !signIn.data.user) {
    throw new Error(
      `e2e/global-setup.ts: failed to sign in as the test user (is "Enable email confirmations" off for the dev project?): ${signIn.error?.message}`
    );
  }

  const userId = signIn.data.user.id;
  const parentTables = ["workout_logs", "workouts", "routines"] as const;
  for (const table of parentTables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`e2e/global-setup.ts: failed to clear ${table}: ${error.message}`);
  }

  const remainingTables = ["exercises", "todos", "goals", "links"] as const;
  for (const table of remainingTables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`e2e/global-setup.ts: failed to clear ${table}: ${error.message}`);
  }
}
