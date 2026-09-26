import { test, expect } from "@playwright/test";

// Stage 4 checkpoint on the hi-fi screens: create a routine and check one of its items
// off on the Routines page, then change its schedule so it isn't on today.
test("create a routine and check an item off today", async ({ page }) => {
  const routineTitle = `Morning routine ${Date.now()}`;
  const itemTitle = `Meditate ${Date.now()}`;

  await page.goto("/routines/new");
  await page.getByLabel("Name", { exact: true }).fill(routineTitle);
  await page.getByRole("button", { name: "Morning", exact: true }).click();
  await page.getByLabel("Item name").fill(itemTitle);
  await page.getByRole("button", { name: "Save routine" }).click();

  // A generous timeout: dev mode compiles the route on its first hit.
  await expect(page).toHaveURL("/routines", { timeout: 20_000 });
  const card = page.getByRole("region", { name: routineTitle });
  await expect(card.getByText("0 of 1 today")).toBeVisible();

  await card.getByRole("checkbox", { name: `Check ${itemTitle}` }).click();

  await expect(card.getByText("1 of 1 today")).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText(itemTitle, { exact: true })).toHaveClass(/line-through/);
  await expect(card.getByText(/^Done \d{1,2}:\d{2} (am|pm)$/)).toBeVisible();
});

test("a routine on other days shows as one line, and can be archived and restored", async ({ page }) => {
  const routineTitle = `Bike maintenance ${Date.now()}`;
  const tomorrow = ((new Date().getDay() + 1) % 7) || 7; // ISO weekday of tomorrow
  const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][tomorrow - 1];

  await page.goto("/routines/new");
  await page.getByLabel("Name", { exact: true }).fill(routineTitle);
  await page.getByRole("button", { name: "Specific days" }).click();
  await page.getByRole("button", { name: dayLabel, exact: true }).click();
  await page.getByLabel("Item name").fill("Wash");
  await page.getByRole("button", { name: "Save routine" }).click();
  await expect(page).toHaveURL("/routines", { timeout: 20_000 });

  await expect(page.getByRole("region", { name: routineTitle })).toHaveCount(0);
  const line = page.getByRole("link", { name: routineTitle });
  await expect(line.locator("xpath=..")).toContainText("· next ");

  await line.click();
  await expect(page.getByRole("heading", { name: "Edit routine" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Archive routine" }).click();
  await expect(page).toHaveURL("/routines", { timeout: 20_000 });
  await expect(page.getByRole("link", { name: routineTitle })).toHaveCount(0);

  await page.getByRole("button", { name: /Archived routines/ }).click();
  await page.getByRole("button", { name: `Restore ${routineTitle}` }).click();
  await expect(page.getByRole("link", { name: routineTitle })).toBeVisible({ timeout: 20_000 });
});
