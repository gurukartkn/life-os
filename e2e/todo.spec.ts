import { test, expect } from "@playwright/test";

// Stage 2 checkpoint: the Today screen's core flow — add a todo, see it in
// the list, complete it (docs/08-implementation-plan.md).
test("add a todo and mark it complete", async ({ page }) => {
  const title = `Buy groceries ${Date.now()}`;

  await page.goto("/todos");

  await page.getByLabel("Todo title").fill(title);
  await page.getByRole("button", { name: "Add todo" }).click();

  const row = page.getByText(title, { exact: true });
  await expect(row).toBeVisible();

  // Its own row: other specs share this account and leave open todos on the page.
  const todoRow = page.locator("div.rounded-md.border", { hasText: title });
  await todoRow.getByRole("checkbox", { name: "Mark as done" }).click();

  await expect(row).toHaveClass(/line-through/, { timeout: 20_000 });
  await expect(todoRow.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible();
});

// Backlog #4 — shadcn calendar for date pickers. A past date is allowed (Stage 2
// shows it as overdue), so pick one from the previous month.
test("pick a due date in the calendar and see it on the task", async ({ page }) => {
  const title = `Renew passport ${Date.now()}`;
  const past = new Date();
  past.setDate(1);
  past.setMonth(past.getMonth() - 1);
  const monthShort = past.toLocaleString("en-US", { month: "short" });

  await page.goto("/todos");
  await page.getByLabel("Todo title").fill(title);

  await page.getByRole("button", { name: "Due date" }).click();
  await page.getByRole("button", { name: /previous month/i }).click();
  await page.getByRole("button", { name: /\b15th, \d{4}/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(`Due date, ${monthShort} 15, \\d{4}`) })).toBeVisible();

  await page.getByRole("button", { name: "Add todo" }).click();

  const row = page.locator("div.rounded-md.border", { hasText: title });
  await expect(row).toContainText(`Due ${monthShort} 15`, { timeout: 20_000 });
});

// Backlog #7 — the filter tabs re-filter the list the page already has; they
// must not make a server round trip. The filter is still URL state.
test("filter tabs switch without any network request and keep the URL in sync", async ({ page }) => {
  const stamp = Date.now();
  const openTitle = `Open ${stamp}`;
  const doneTitle = `Done ${stamp}`;

  await page.goto("/todos");
  for (const title of [openTitle, doneTitle]) {
    await page.getByLabel("Todo title").fill(title);
    await page.getByRole("button", { name: "Add todo" }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  const doneRow = page.locator("div.rounded-md.border", { hasText: doneTitle });
  await doneRow.getByRole("checkbox", { name: "Mark as done" }).click();
  // The toggle is a Server Action plus a page refresh, so allow for the round trips.
  await expect(doneRow.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({
    timeout: 20_000,
  });

  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.getByRole("link", { name: "Active" }).click();
  await expect(page).toHaveURL(/\/todos\?status=active$/);
  await expect(page.getByText(openTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(doneTitle, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Completed" }).click();
  await expect(page).toHaveURL(/\/todos\?status=completed$/);
  await expect(page.getByText(doneTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(openTitle, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "All" }).click();
  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByText(openTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(doneTitle, { exact: true })).toBeVisible();

  expect(requests).toEqual([]);
});

test("a filter deep link loads filtered, and Back returns to the previous filter", async ({ page }) => {
  const title = `Deep ${Date.now()}`;
  await page.goto("/todos");
  await page.getByLabel("Todo title").fill(title);
  await page.getByRole("button", { name: "Add todo" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.goto("/todos?status=completed");
  await expect(page.getByRole("link", { name: "Completed" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Active" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/status=completed$/);
  await expect(page.getByRole("link", { name: "Completed" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});
