import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import { loadEnvLocal } from "./load-env";

// v2 Stage 2 renamed the links entity type 'todo' to 'task' (migration
// 20260921193344_rename_todos_to_tasks). `links` has no app UI yet, so this checks the
// database contract directly on the dev project, signed in as the e2e account (RLS applies).
loadEnvLocal();

const CHECK_VIOLATION = "23514";

async function signedInClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  if (error || !data.user) throw new Error(`links.spec: sign-in failed: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

function link(userId: string, source_type: string, target_type: string) {
  return {
    user_id: userId,
    source_type,
    source_id: crypto.randomUUID(),
    target_type,
    target_id: crypto.randomUUID(),
  };
}

test.describe("links entity types", () => {
  test("accept 'task' as the source and as the target", async () => {
    const { supabase, userId } = await signedInClient();
    const rows = [link(userId, "task", "routine"), link(userId, "goal", "task")];

    const { data, error } = await supabase.from("links").insert(rows).select("id");
    try {
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    } finally {
      await supabase.from("links").delete().in("source_id", rows.map((row) => row.source_id));
    }
  });

  test("reject the old 'todo' as the source and as the target", async () => {
    const { supabase, userId } = await signedInClient();

    const asSource = await supabase.from("links").insert(link(userId, "todo", "routine"));
    expect(asSource.error?.code).toBe(CHECK_VIOLATION);
    expect(asSource.error?.message).toContain("links_source_type_check");

    const asTarget = await supabase.from("links").insert(link(userId, "goal", "todo"));
    expect(asTarget.error?.code).toBe(CHECK_VIOLATION);
    expect(asTarget.error?.message).toContain("links_target_type_check");
  });
});
