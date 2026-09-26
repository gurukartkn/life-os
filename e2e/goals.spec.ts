import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addMonths, format, setDate } from "date-fns";
import { test, expect, type Page } from "@playwright/test";
import { loadEnvLocal } from "./load-env";

// Stage 5a checkpoint on the hi-fi screens: create, edit, change the status of and delete
// a goal; link and unlink a task, routine, workout and exercise from the goal detail; and
// the Today Goals card. The items to link are created directly as the e2e account (RLS
// applies) so each test only drives the Goals screens, and are removed afterwards.
loadEnvLocal();

// A generous timeout: dev mode compiles each route on its first hit.
const SLOW = { timeout: 20_000 };

async function signedInClient(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  if (error || !data.user) throw new Error(`goals.spec: sign-in failed: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

// The 15th of next or last month: always in the future (or past), and a day the calendar
// reaches in one step.
const NEXT_15TH = setDate(addMonths(new Date(), 1), 15);
const LAST_15TH = setDate(addMonths(new Date(), -1), 15);

async function createGoal(page: Page, title: string, { date }: { date?: "next" | "last" } = {}) {
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).first().click();
  // By name: the calendar popover is a dialog too, and it is still fading out after a pick.
  const dialog = page.getByRole("dialog", { name: "New goal" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(title);
  if (date) {
    await dialog.getByRole("button", { name: "Target date" }).click();
    await page.getByRole("button", { name: date === "next" ? /next month/i : /previous month/i }).click();
    await page.getByRole("button", { name: /\b15th, \d{4}/ }).click();
    await expect(page.getByRole("grid")).toBeHidden();
  }
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden(SLOW);
  return page.locator('[data-slot="goal-row"]', { hasText: title });
}

async function openGoal(page: Page, title: string) {
  await page.goto("/goals");
  await page.locator('[data-slot="goal-row"]', { hasText: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible(SLOW);
}

test("create a goal, edit it, change its status and delete it", async ({ page }) => {
  const title = `Run a 10K ${Date.now()}`;
  const renamed = `${title} under 50 min`;

  const row = await createGoal(page, title, { date: "next" });
  await expect(row).toContainText(format(NEXT_15TH, "d MMM yyyy"));
  await expect(row).toContainText(/\d+ days left/);
  await expect(row).toContainText("Active");
  await expect(row).toContainText("0 items");

  // The sheet refuses an empty title.
  await openGoal(page, title);
  await page.getByRole("button", { name: "Edit goal" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit goal" });
  await dialog.getByLabel("Title").fill("   ");
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog.getByText("Enter a title.")).toBeVisible();

  // Rename and mark achieved: the header says when it was reached.
  await dialog.getByLabel("Title").fill(renamed);
  await dialog.getByRole("group", { name: "Status" }).getByRole("button", { name: "Achieved" }).click();
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden(SLOW);
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible(SLOW);
  await expect(page.locator("main").getByText("Achieved", { exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="goal-date-label"]')).toHaveText(/^Reached \d{1,2} \w{3}$/);

  // Dropped: the reached date goes.
  await page.getByRole("button", { name: "Edit goal" }).click();
  await dialog.getByRole("group", { name: "Status" }).getByRole("button", { name: "Dropped" }).click();
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await expect(dialog).toBeHidden(SLOW);
  await expect(page.locator("main").getByText("Dropped", { exact: true })).toBeVisible(SLOW);
  await expect(page.locator('[data-slot="goal-date-label"]')).toHaveCount(0);

  // Delete asks once, then goes back to the list without the goal.
  await page.getByRole("button", { name: "Edit goal" }).click();
  await dialog.getByRole("button", { name: "Delete goal" }).click();
  await expect(dialog.getByText("Delete this goal?")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep goal" }).click();
  await dialog.getByRole("button", { name: "Delete goal" }).click();
  await dialog.getByRole("button", { name: "Delete goal" }).click();
  await expect(page).toHaveURL("/goals", SLOW);
  await expect(page.locator('[data-slot="goal-row"]', { hasText: renamed })).toHaveCount(0);
});

test.describe("linking", () => {
  const stamp = Date.now();
  const names = {
    task: `Clean running shoes ${stamp}`,
    routine: `Stretching ${stamp}`,
    workout: `Run intervals ${stamp}`,
    exercise: `Treadmill run ${stamp}`,
  };
  const ids: Record<string, string> = {};

  test.beforeAll(async () => {
    const { supabase, userId } = await signedInClient();
    const insert = async (table: string, row: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).insert({ user_id: userId, ...row }).select("id").single();
      if (error) throw new Error(`goals.spec: could not create a ${table} row: ${error.message}`);
      return data.id as string;
    };
    ids.task = await insert("tasks", { title: names.task });
    ids.routine = await insert("routines", { title: names.routine, frequency: "times_per_week", times_per_week: 3 });
    ids.workout = await insert("workouts", { name: names.workout });
    ids.exercise = await insert("exercises", { name: names.exercise, exercise_type: "cardio" });
  });

  test.afterAll(async () => {
    const { supabase } = await signedInClient();
    await supabase.from("links").delete().in("target_id", Object.values(ids));
    await supabase.from("tasks").delete().eq("id", ids.task);
    await supabase.from("routines").delete().eq("id", ids.routine);
    await supabase.from("workouts").delete().eq("id", ids.workout);
    await supabase.from("exercises").delete().eq("id", ids.exercise);
  });

  test("link and unlink a task, routine, workout and exercise from the goal detail", async ({ page }) => {
    const title = `Goal with links ${stamp}`;
    await createGoal(page, title);
    await openGoal(page, title);

    const group = (name: string) => page.getByRole("region", { name });
    const pick = async (groupName: string, itemNames: string[]) => {
      await group(groupName).getByRole("button", { name: `Link ${groupName.toLowerCase()}` }).click();
      const picker = page.locator('[data-slot="popover-content"]');
      await expect(picker.getByText("Tick to link, untick to unlink.")).toBeVisible();
      for (const itemName of itemNames) {
        await picker.getByRole("searchbox").fill(itemName);
        await picker.getByRole("checkbox", { name: itemName }).click();
      }
      // Closing the picker saves.
      await page.keyboard.press("Escape");
      await expect(picker).toBeHidden();
    };

    await pick("Tasks", [names.task]);
    await pick("Routines", [names.routine]);
    await pick("Fitness items", [names.workout, names.exercise]);

    await expect(group("Tasks").getByText(names.task)).toBeVisible(SLOW);
    await expect(group("Tasks")).toContainText("1 linked");
    await expect(group("Routines").getByText(names.routine)).toBeVisible(SLOW);
    await expect(group("Routines")).toContainText("3 times a week · Anytime");
    await expect(group("Fitness items").getByText(names.workout)).toBeVisible(SLOW);
    await expect(group("Fitness items").getByText(names.exercise)).toBeVisible();
    await expect(group("Fitness items")).toContainText("2 linked");

    // The list counts all four.
    await page.goto("/goals");
    await expect(page.locator('[data-slot="goal-row"]', { hasText: title })).toContainText("4 items", SLOW);

    // Unlink the task and the exercise with their row buttons…
    await openGoal(page, title);
    await group("Tasks").getByRole("button", { name: `Unlink ${names.task}` }).click();
    await expect(group("Tasks").getByText(names.task)).toBeHidden(SLOW);
    await expect(group("Tasks")).toContainText("Nothing linked yet.");
    await group("Fitness items").getByRole("button", { name: `Unlink ${names.exercise}` }).click();
    await expect(group("Fitness items").getByText(names.exercise)).toBeHidden(SLOW);

    // …and the routine and the workout by unticking them in the picker.
    await pick("Routines", [names.routine]);
    await pick("Fitness items", [names.workout]);
    await expect(group("Routines").getByText(names.routine)).toBeHidden(SLOW);
    await expect(group("Fitness items").getByText(names.workout)).toBeHidden(SLOW);
    await expect(group("Fitness items")).toContainText("0 linked");

    await page.goto("/goals");
    await expect(page.locator('[data-slot="goal-row"]', { hasText: title })).toContainText("0 items", SLOW);
  });
});

test("the Today Goals card shows active goals by nearest target date", async ({ page }) => {
  // Past its target, so it is the nearest: the other specs only add future or undated goals.
  const title = `Renew passport ${Date.now()}`;
  const row = await createGoal(page, title, { date: "last" });
  await expect(row).toContainText(/Overdue by \d+ days/);

  await page.goto("/today");
  const card = page.getByRole("region", { name: "Goals" });
  await expect(card).toBeVisible(SLOW);
  const rows = card.getByRole("listitem");
  expect(await rows.count()).toBeLessThanOrEqual(3);
  const cardRow = rows.filter({ hasText: title });
  await expect(cardRow).toHaveCount(1);
  await expect(cardRow).toContainText(`Target ${format(LAST_15TH, "d MMM")} · 0 linked`);
  await expect(cardRow).toContainText("Active");

  await card.getByRole("link", { name: "All goals" }).click();
  await expect(page).toHaveURL("/goals", SLOW);
});
