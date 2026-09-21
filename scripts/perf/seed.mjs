// Perf harness only. Seeds / clears data on the life-os-dev e2e account.
//   node scripts/perf/seed.mjs small   (~12 tasks, 3 workouts, 2 routines — real-usage scale)
//   node scripts/perf/seed.mjs large   (300 tasks, 30 workouts, 10 routines)
//   node scripts/perf/seed.mjs clear
// Uses the anon key + the e2e user's session, so RLS scopes everything to that
// account. Refuses to run unless the URL is the dev project.
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env.mjs";

loadEnvLocal();
const DEV_REF = "ohtcgyqashnvtliwyceo";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url?.includes(DEV_REF)) throw new Error("seed.mjs: NEXT_PUBLIC_SUPABASE_URL is not life-os-dev — refusing.");

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
});
if (authError) throw new Error(`seed.mjs: sign-in failed: ${authError.message}`);
const userId = auth.user.id;

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`seed.mjs: ${label}: ${error.message}`);
  return data;
}

async function clear() {
  for (const table of ["workout_logs", "workouts", "routines"]) {
    await must(supabase.from(table).delete().eq("user_id", userId), `clear ${table}`);
  }
  for (const table of ["exercises", "tasks", "goals", "links"]) {
    await must(supabase.from(table).delete().eq("user_id", userId), `clear ${table}`);
  }
}

const mode = process.argv[2];
if (mode === "clear") {
  await clear();
  console.log("cleared e2e account data");
  process.exit(0);
}
if (mode !== "small" && mode !== "large") throw new Error("usage: seed.mjs small|large|clear");

const size = mode === "large" ? { tasks: 300, workouts: 30, routines: 10, items: 8 } : { tasks: 12, workouts: 3, routines: 2, items: 4 };
await clear();

const today = new Date();
const iso = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

await must(
  supabase.from("tasks").insert(
    Array.from({ length: size.tasks }, (_, i) => ({
      user_id: userId,
      title: `perf task ${i + 1}`,
      due_date: i % 3 === 0 ? null : iso((i % 9) - 3),
      is_completed: i % 3 === 1, // ~1/3 completed → all / active / completed counts all differ
      completed_at: i % 3 === 1 ? new Date().toISOString() : null,
    }))
  ),
  "tasks"
);

await must(supabase.from("goals").insert([{ user_id: userId, title: "perf goal" }]), "goals");

const exercises = await must(
  supabase
    .from("exercises")
    .insert(
      Array.from({ length: 12 }, (_, i) => ({
        user_id: userId,
        name: `perf exercise ${i + 1}`,
        exercise_type: "weight_training",
        muscle_groups: ["chest", "back", "legs"].slice(0, (i % 3) + 1),
        equipment: ["barbell"],
      }))
    )
    .select("id"),
  "exercises"
);

const workouts = await must(
  supabase
    .from("workouts")
    .insert(Array.from({ length: size.workouts }, (_, i) => ({ user_id: userId, name: `perf workout ${i + 1}` })))
    .select("id"),
  "workouts"
);
await must(
  supabase.from("workout_exercises").insert(
    workouts.flatMap((w, wi) =>
      [0, 1, 2, 3].map((k) => ({
        user_id: userId,
        workout_id: w.id,
        exercise_id: exercises[(wi + k) % exercises.length].id,
        sort_order: k,
        target_sets: 3,
        target_reps: "8-10",
      }))
    )
  ),
  "workout_exercises"
);
await must(
  supabase.from("workout_logs").insert(
    workouts.flatMap((w, wi) => [0, 1].map((k) => ({ user_id: userId, workout_id: w.id, performed_on: iso(-(wi + k * 7)) })))
  ),
  "workout_logs"
);

const routines = await must(
  supabase
    .from("routines")
    .insert(
      Array.from({ length: size.routines }, (_, i) => ({
        user_id: userId,
        title: `perf routine ${i + 1}`,
        cadence: i % 2 === 0 ? "daily" : "weekly",
      }))
    )
    .select("id"),
  "routines"
);
await must(
  supabase.from("routine_items").insert(
    routines.flatMap((r) =>
      Array.from({ length: size.items }, (_, k) => ({ user_id: userId, routine_id: r.id, title: `perf item ${k + 1}`, sort_order: k }))
    )
  ),
  "routine_items"
);

console.log(`seeded ${mode}: ${JSON.stringify(size)}`);
