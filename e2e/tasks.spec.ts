import { format } from "date-fns";
import { test, expect } from "@playwright/test";
import { addTask, openAddTask, openTaskDrawer, taskRow } from "./task-helpers";

// "Fri 25 Sep", formatted as the app does (lib/dates.ts formatShortDate). The en-GB locale
// spells September "Sept", so it can't stand in for it.
function shortDate(date: Date): string {
  return format(date, "EEE d MMM");
}

function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
}

// Stage 2 checkpoint: the Tasks screen's core flow — add a task, see it in
// the list, complete it (docs/08-implementation-plan.md).
test("add a task from the header and mark it complete", async ({ page }) => {
  const title = `Buy groceries ${Date.now()}`;

  await page.goto("/tasks");
  await addTask(page, title);

  const row = taskRow(page, title);
  await row.getByRole("checkbox", { name: "Mark as done" }).click();
  await expect(row.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({ timeout: 20_000 });
});

// Backlog #4 — the calendar date picker. A past date is allowed (it shows as
// overdue), so pick one from the previous month.
test("pick a due date in the calendar and see it on the task", async ({ page }) => {
  const title = `Renew passport ${Date.now()}`;
  const past = new Date();
  past.setDate(15);
  past.setMonth(past.getMonth() - 1);

  await page.goto("/tasks");
  const dialog = await openAddTask(page);
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Due date" }).click();
  await page.getByRole("button", { name: /previous month/i }).click();
  await page.getByRole("button", { name: /\b15th, \d{4}/ }).click();
  await expect(dialog.getByRole("button", { name: /^Due date, \w{3} 15 \w{3} \d{4}$/ })).toBeVisible();
  await expect(dialog.getByText("Overdue", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(taskRow(page, title)).toContainText(`Overdue · ${shortDate(past)}`, { timeout: 20_000 });
});

// v2 Stage 2 — a task can be created already overdue; it shows as overdue until it is completed.
test("a task dated yesterday saves, shows overdue, and stops being overdue once completed", async ({ page }) => {
  const title = `Overdue ${Date.now()}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = yesterday.getDate();
  const monthLong = yesterday.toLocaleString("en-US", { month: "long" });

  await page.goto("/tasks");
  const dialog = await openAddTask(page);
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Due date" }).click();
  // Yesterday is in the previous month when today is the 1st.
  if (yesterday.getMonth() !== new Date().getMonth()) {
    await page.getByRole("button", { name: /previous month/i }).click();
  }
  await page
    .getByRole("button", { name: new RegExp(`${monthLong} ${day}${ordinal(day)}, ${yesterday.getFullYear()}`) })
    .click();
  await dialog.getByRole("button", { name: "Create" }).click();

  const row = taskRow(page, title);
  const overdue = row.getByText(`Overdue · ${shortDate(yesterday)}`);
  await expect(overdue).toBeVisible({ timeout: 20_000 });
  await expect(overdue).toHaveClass(/text-pink-ink/);

  await row.getByRole("checkbox", { name: "Mark as done" }).click();
  await expect(row.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({ timeout: 20_000 });
  // The status text, not the title (which starts with "Overdue" too).
  await expect(row.getByText(/^Overdue · /)).toHaveCount(0);
  await expect(row.getByText(shortDate(yesterday), { exact: true })).toBeVisible();
});

// Phase 8.2a — create in the dialog, then view / edit / delete in the drawer, with toasts.
test("create → open the drawer → edit → delete with confirmation", async ({ page }) => {
  const title = `Edit me ${Date.now()}`;
  const renamed = `${title} (renamed)`;

  await page.goto("/tasks");
  await addTask(page, title);
  await expect(page.getByText("Task created")).toBeVisible();

  // Read mode first: details, Edit and Delete, no form.
  let drawer = await openTaskDrawer(page, title);
  await expect(drawer.getByText("Status")).toBeVisible();
  await expect(drawer.getByLabel("Title")).toHaveCount(0);

  // Edit swaps in the form; Save returns to read mode with the new title.
  await drawer.getByRole("button", { name: "Edit" }).click();
  await expect(drawer.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await drawer.getByLabel("Title").fill(renamed);
  await drawer.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Task saved")).toBeVisible();
  await expect(drawer.getByRole("heading", { name: renamed })).toBeVisible({ timeout: 20_000 });
  await expect(drawer.getByLabel("Title")).toHaveCount(0);

  // Delete asks first; Cancel leaves everything as it was.
  await drawer.getByRole("button", { name: "Delete" }).click();
  let confirm = page.getByRole("alertdialog", { name: "Delete permanently?" });
  await expect(confirm).toContainText("This can't be undone.");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(drawer.getByRole("heading", { name: renamed })).toBeVisible();

  await drawer.getByRole("button", { name: "Delete" }).click();
  confirm = page.getByRole("alertdialog", { name: "Delete permanently?" });
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Task deleted")).toBeVisible();
  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/view=/);

  drawer = page.locator('[data-slot="entity-drawer"]');
  await expect(drawer).toHaveCount(0);
});

test("a ?view=task:<id> link opens the drawer directly, and Back / Close shut it", async ({ page }) => {
  const title = `Deep drawer ${Date.now()}`;
  await page.goto("/tasks");
  await addTask(page, title);
  await openTaskDrawer(page, title);
  const drawerUrl = page.url();

  // Back closes a drawer opened from the list.
  await page.goBack();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.locator('[data-slot="entity-drawer"]')).toHaveCount(0);

  // A fresh load of the drawer URL renders it open, read-only.
  await page.goto(drawerUrl);
  const drawer = page.locator('[data-slot="entity-drawer"]');
  await expect(drawer.getByRole("heading", { name: title })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit" })).toBeVisible();

  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page).toHaveURL(/\/tasks$/);
});

test("unsaved edits in the drawer are guarded on Cancel, Esc and Back", async ({ page }) => {
  const title = `Guarded ${Date.now()}`;
  await page.goto("/tasks");
  await addTask(page, title);
  const drawer = await openTaskDrawer(page, title);

  await drawer.getByRole("button", { name: "Edit" }).click();
  await drawer.getByLabel("Title").fill(`${title} changed`);

  const discard = page.getByRole("alertdialog", { name: "Discard changes?" });
  for (const [how, leave] of [
    ["Cancel", () => drawer.getByRole("button", { name: "Cancel" }).click()],
    ["Esc", () => page.keyboard.press("Escape")],
    ["Back", () => page.goBack()],
  ] as const) {
    await leave();
    await expect(discard, `${how} asks before discarding`).toBeVisible();
    await discard.getByRole("button", { name: "Keep editing" }).click();
    await expect(discard).toBeHidden();
    await expect(drawer.getByLabel("Title")).toHaveValue(`${title} changed`);
    await expect(page).toHaveURL(/view=task:/);
  }

  await page.keyboard.press("Escape");
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(page.locator('[data-slot="entity-drawer"]')).toHaveCount(0);
  await expect(page).not.toHaveURL(/view=/);
  await expect(page.getByText(`${title} changed`, { exact: true })).toHaveCount(0);
});

test("Today's task links open that task's drawer", async ({ page }) => {
  const title = `Due today ${Date.now()}`;
  await page.goto("/tasks");
  const dialog = await openAddTask(page);
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Due date" }).click();
  const now = new Date();
  const monthLong = now.toLocaleString("en-US", { month: "long" });
  await page
    .getByRole("button", { name: new RegExp(`${monthLong} ${now.getDate()}${ordinal(now.getDate())}, ${now.getFullYear()}`) })
    .click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(taskRow(page, title)).toBeVisible({ timeout: 20_000 });

  await page.goto("/today");
  await page.getByRole("region", { name: "Tasks" }).getByRole("link", { name: new RegExp(title) }).click();

  await expect(page).toHaveURL(/\/tasks\?view=task:[0-9a-f-]{36}$/);
  await expect(page.locator('[data-slot="entity-drawer"]').getByRole("heading", { name: title })).toBeVisible();
});

// Backlog #7 — the filter tabs re-filter the list the page already has; they
// must not make a server round trip. The filter is still URL state.
test("filter tabs switch without any network request and keep the URL in sync", async ({ page }) => {
  const stamp = Date.now();
  const openTitle = `Open ${stamp}`;
  const doneTitle = `Done ${stamp}`;

  await page.goto("/tasks");
  for (const title of [openTitle, doneTitle]) {
    await addTask(page, title);
  }
  const doneRow = taskRow(page, doneTitle);
  await doneRow.getByRole("checkbox", { name: "Mark as done" }).click();
  // The toggle is a Server Action plus a page refresh, so allow for the round trips.
  await expect(doneRow.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({
    timeout: 20_000,
  });

  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.getByRole("link", { name: /^Active \d+$/ }).click();
  await expect(page).toHaveURL(/\/tasks\?status=active$/);
  await expect(page.getByText(openTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(doneTitle, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /^Completed \d+$/ }).click();
  await expect(page).toHaveURL(/\/tasks\?status=completed$/);
  await expect(page.getByText(doneTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(openTitle, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /^All \d+$/ }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText(openTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(doneTitle, { exact: true })).toBeVisible();

  expect(requests).toEqual([]);
});

test("a filter deep link loads filtered, and Back returns to the previous filter", async ({ page }) => {
  const title = `Deep ${Date.now()}`;
  await page.goto("/tasks");
  await addTask(page, title);

  await page.goto("/tasks?status=completed");
  await expect(page.getByRole("link", { name: /^Completed \d+$/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /^Active \d+$/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/status=completed$/);
  await expect(page.getByRole("link", { name: /^Completed \d+$/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});
