// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createGoal, deleteGoal, updateGoal } from "@/actions/goals";
import { linkItem, setLinks, unlinkItem } from "@/actions/links";
import { deleteTask } from "@/actions/tasks";
import { deleteWorkout } from "@/actions/workouts";
import { getGoalDetail, getLinkPicker, listGoals } from "@/lib/queries/goals";
import { emptyAccountEmail, loadEnvLocal } from "@/e2e/load-env";
import type { Database } from "@/lib/types/database";

// Runs the goal and link actions against the real life-os-dev database, signed in as the
// e2e test accounts (see e2e/global-setup.ts). Skipped when .env.local has no credentials.
// Every row it creates is named with RUN and removed afterwards.

loadEnvLocal();

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => state.client) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

type Client = SupabaseClient<Database>;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const configured = Boolean(URL && ANON_KEY && EMAIL && PASSWORD);

const RUN = `goals-it-${Date.now().toString(36)}`;
const CHECK_VIOLATION = "23514";

async function signIn(email: string): Promise<{ client: Client; userId: string }> {
  const client = createSupabaseClient<Database>(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD! });
  if (error || !data.user) throw new Error(`Could not sign in as ${email} (run Playwright once to create it)`);
  return { client, userId: data.user.id };
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe.skipIf(!configured)("goals data layer against life-os-dev", { timeout: 30_000 }, () => {
  let me: Client;
  let myId: string;
  let other: Client;
  let otherId: string;

  const created: { client: () => Client; table: "goals" | "tasks" | "routines" | "workouts" | "exercises"; id: string }[] =
    [];

  const asMe = () => {
    state.client = me;
  };

  async function makeGoal(title: string, status = "active"): Promise<string> {
    asMe();
    expect(await createGoal({ success: false }, form({ title: `${RUN} ${title}`, status }))).toEqual({ success: true });
    const { data } = await me.from("goals").select("id").eq("title", `${RUN} ${title}`).single();
    created.push({ client: () => me, table: "goals", id: data!.id });
    return data!.id;
  }

  async function makeTask(title: string, who: "me" | "other" = "me"): Promise<string> {
    const client = who === "me" ? me : other;
    const { data, error } = await client
      .from("tasks")
      .insert({ user_id: who === "me" ? myId : otherId, title: `${RUN} ${title}` })
      .select("id")
      .single();
    expect(error).toBeNull();
    created.push({ client: () => client, table: "tasks", id: data!.id });
    return data!.id;
  }

  async function makeRow(table: "routines" | "workouts" | "exercises", name: string): Promise<string> {
    const row =
      table === "routines"
        ? me.from("routines").insert({ user_id: myId, title: `${RUN} ${name}` })
        : table === "workouts"
          ? me.from("workouts").insert({ user_id: myId, name: `${RUN} ${name}` })
          : me.from("exercises").insert({ user_id: myId, name: `${RUN} ${name}`, exercise_type: "cardio" });
    const { data, error } = await row.select("id").single();
    expect(error).toBeNull();
    created.push({ client: () => me, table, id: data!.id });
    return data!.id;
  }

  async function linksFrom(goalId: string) {
    const { data } = await me.from("links").select("target_type, target_id").eq("source_id", goalId);
    return data ?? [];
  }

  async function linksTo(targetId: string) {
    const { data } = await me.from("links").select("id").eq("target_id", targetId);
    return data ?? [];
  }

  beforeAll(async () => {
    ({ client: me, userId: myId } = await signIn(EMAIL!));
    ({ client: other, userId: otherId } = await signIn(emptyAccountEmail()));
  }, 30_000);

  afterAll(async () => {
    if (!me) return;
    const ids = created.map((row) => row.id);
    if (ids.length) {
      await me.from("links").delete().in("source_id", ids);
      await me.from("links").delete().in("target_id", ids);
    }
    for (const { client, table, id } of created.reverse()) await client().from(table).delete().eq("id", id);
  }, 30_000);

  it("linking the same item twice leaves one link row, with the goal as its source", async () => {
    const goalId = await makeGoal("Twice");
    const taskId = await makeTask("Twice task");

    asMe();
    expect(await linkItem(goalId, { type: "task", id: taskId })).toEqual({ success: true });
    expect(await linkItem(goalId, { type: "task", id: taskId })).toEqual({ success: true });

    const { data } = await me.from("links").select("source_type, target_type").eq("source_id", goalId);
    expect(data).toEqual([{ source_type: "goal", target_type: "task" }]);
  });

  it("refuses a link row with a goal as its target", async () => {
    const goalId = await makeGoal("Target");
    const taskId = await makeTask("Target task");

    const { error } = await me.from("links").insert({
      user_id: myId,
      source_type: "task",
      source_id: taskId,
      target_type: "goal",
      target_id: goalId,
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
    expect(error?.message).toContain("links_goal_is_source_check");
  });

  it("deleting a linked task or workout removes the links to it", async () => {
    const goalId = await makeGoal("Cleanup");
    const taskId = await makeTask("Cleanup task");
    const workoutId = await makeRow("workouts", "Cleanup workout");

    asMe();
    expect(await setLinks(goalId, "task", [taskId])).toEqual({ success: true });
    expect(await setLinks(goalId, "workout", [workoutId])).toEqual({ success: true });
    expect(await linksTo(taskId)).toHaveLength(1);
    expect(await linksTo(workoutId)).toHaveLength(1);

    expect(await deleteTask(taskId)).toEqual({ success: true });
    expect(await deleteWorkout(workoutId)).toEqual({ success: true });

    expect(await linksTo(taskId)).toEqual([]);
    expect(await linksTo(workoutId)).toEqual([]);
  });

  // Routines are archived, not deleted: there is no routine delete action to clean up after.
  it.todo("deleting a linked routine removes the links to it (no routine delete action exists yet)");

  it("deleteGoal removes the goal's links along with it", async () => {
    const goalId = await makeGoal("Delete me");
    const routineId = await makeRow("routines", "Delete me routine");
    const exerciseId = await makeRow("exercises", "Delete me exercise");

    asMe();
    expect(await linkItem(goalId, { type: "routine", id: routineId })).toEqual({ success: true });
    expect(await linkItem(goalId, { type: "exercise", id: exerciseId })).toEqual({ success: true });
    expect(await linksFrom(goalId)).toHaveLength(2);

    const { redirect } = await import("next/navigation");
    await deleteGoal(goalId);
    expect(redirect).toHaveBeenCalledWith("/goals");

    expect(await linksFrom(goalId)).toEqual([]);
    const { data } = await me.from("goals").select("id").eq("id", goalId);
    expect(data).toEqual([]);
  });

  it("refuses to link another user's item, and to link to another user's goal", async () => {
    const goalId = await makeGoal("Mine");
    const theirTask = await makeTask("Theirs", "other");
    const myTask = await makeTask("Mine task");

    asMe();
    expect(await linkItem(goalId, { type: "task", id: theirTask })).toEqual({
      success: false,
      error: "That no longer exists.",
    });
    expect(await setLinks(goalId, "task", [myTask, theirTask])).toEqual({
      success: false,
      error: "That no longer exists.",
    });
    expect(await linksFrom(goalId)).toEqual([]);

    // Signed in as the other account, my goal is invisible.
    state.client = other;
    expect(await linkItem(goalId, { type: "task", id: theirTask })).toEqual({
      success: false,
      error: "That no longer exists.",
    });
    const { data } = await other.from("links").select("id").eq("target_id", theirTask);
    expect(data).toEqual([]);
  });

  it("setLinks applies the picker's diff, and the list and detail read it back without orphans", async () => {
    const goalId = await makeGoal("Picker");
    const keep = await makeTask("Keep");
    const drop = await makeTask("Drop");
    const add = await makeTask("Add");

    asMe();
    expect(await setLinks(goalId, "task", [keep, drop])).toEqual({ success: true });
    expect(await setLinks(goalId, "task", [keep, add])).toEqual({ success: true });
    expect((await linksFrom(goalId)).map((link) => link.target_id).sort()).toEqual([keep, add].sort());

    // An orphaned link (its task deleted behind the action's back) is neither counted nor listed.
    await me.from("tasks").delete().eq("id", add);
    const { goals } = await listGoals(me);
    expect(goals.find((goal) => goal.id === goalId)?.linkedCount).toBe(1);
    const { detail } = await getGoalDetail(me, goalId);
    expect(detail?.linked.task.map((task) => task.id)).toEqual([keep]);

    const { picker } = await getLinkPicker(me, goalId);
    expect(picker.task.find((task) => task.id === keep)?.linked).toBe(true);
    expect(picker.task.find((task) => task.id === drop)?.linked).toBe(false);

    expect(await unlinkItem(goalId, { type: "task", id: keep })).toEqual({ success: true });
    expect((await listGoals(me)).goals.find((goal) => goal.id === goalId)?.linkedCount).toBe(0);
  });

  it("stamps achieved_on when a goal is achieved and clears it when it is reopened", async () => {
    const goalId = await makeGoal("Status");
    asMe();

    await updateGoal({ success: false }, form({ id: goalId, title: `${RUN} Status`, status: "achieved" }));
    const achieved = await me.from("goals").select("status, achieved_on").eq("id", goalId).single();
    expect(achieved.data?.status).toBe("achieved");
    expect(achieved.data?.achieved_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await updateGoal({ success: false }, form({ id: goalId, title: `${RUN} Status`, status: "active" }));
    const reopened = await me.from("goals").select("status, achieved_on").eq("id", goalId).single();
    expect(reopened.data).toEqual({ status: "active", achieved_on: null });
  });
});
