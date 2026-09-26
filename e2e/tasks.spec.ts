import { test, expect } from "@playwright/test";
import { addTask, openAddTask, taskRow } from "./task-helpers";

function shortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
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
  await dialog.getByRole("button", { name: "Add task" }).click();

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
  await dialog.getByRole("button", { name: "Add task" }).click();

  const row = taskRow(page, title);
  const overdue = row.getByText(`Overdue · ${shortDate(yesterday)}`);
  await expect(overdue).toBeVisible({ timeout: 20_000 });
  await expect(overdue).toHaveClass(/text-pink-ink/);

  await row.getByRole("checkbox", { name: "Mark as done" }).click();
  await expect(row.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({ timeout: 20_000 });
  await expect(row.getByText(/Overdue/)).toHaveCount(0);
  await expect(row.getByText(shortDate(yesterday), { exact: true })).toBeVisible();
});

test("edit a task's title and delete it from the modal", async ({ page }) => {
  const title = `Edit me ${Date.now()}`;
  const renamed = `${title} (renamed)`;

  await page.goto("/tasks");
  await addTask(page, title);

  await taskRow(page, title).getByRole("button", { name: `Edit ${title}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await dialog.getByLabel("Title").fill(renamed);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible({ timeout: 20_000 });

  await taskRow(page, renamed).getByRole("button", { name: `Edit ${renamed}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0, { timeout: 20_000 });
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
