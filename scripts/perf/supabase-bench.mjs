// Perf harness only. Times raw Supabase calls from this machine against life-os-dev:
// network RTT, auth.getUser() (network) vs auth.getClaims() (local JWT verify),
// and a few representative queries. Read-only.
//   node scripts/perf/supabase-bench.mjs [--n=20] [--out=perf-out/supabase-bench.json]
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, stats } from "./env.mjs";

loadEnvLocal();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const N = Number(args.n ?? 20);
const OUT = args.out ?? "perf-out/supabase-bench.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url?.includes("ohtcgyqashnvtliwyceo")) throw new Error("supabase-bench: not life-os-dev — refusing.");
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
});
if (error) throw new Error(`sign-in failed: ${error.message}`);

async function time(label, fn, { warmup = 1 } = {}) {
  const samples = [];
  for (let i = 0; i < N + warmup; i++) {
    const t0 = performance.now();
    await fn();
    if (i >= warmup) samples.push(performance.now() - t0);
  }
  return [label, stats(samples)];
}

const results = Object.fromEntries([
  await time("rtt_auth_health (GET /auth/v1/health)", () => fetch(`${url}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } })),
  await time("auth.getUser (network)", () => supabase.auth.getUser()),
  await time("auth.getClaims (local, JWKS cached)", () => supabase.auth.getClaims()),
  await time("select tasks (all)", () => supabase.from("tasks").select("*")),
  await time("select tasks limit 1", () => supabase.from("tasks").select("id").limit(1)),
  await time("6 parallel select-limit-1 (export-has-data probe)", () =>
    Promise.all(["tasks", "goals", "routines", "exercises", "workouts", "workout_logs"].map((t) => supabase.from(t).select("id").limit(1)))
  ),
]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), n: N, results }, null, 2));
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(58), JSON.stringify(v));
