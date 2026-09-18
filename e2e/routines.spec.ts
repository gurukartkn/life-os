import { test, expect } from "@playwright/test";

// Stage 4 checkpoint: create a routine and complete one of its items
// (docs/08-implementation-plan.md).
test("create a routine and complete an item", async ({ page }) => {
  const routineTitle = `Morning routine ${Date.now()}`;
  const itemTitle = "Meditate";

  await page.goto("/routines/new");
  await page.getByLabel("Title").fill(routineTitle);
  await page.getByLabel("Item 1").fill(itemTitle);
  await page.getByRole("button", { name: "Create routine" }).click();

  await expect(page).toHaveURL("/routines");
  const routineCard = page
    .getByText(routineTitle, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await routineCard.getByRole("link", { name: "View checklist" }).click();

  await expect(page).toHaveURL(/\/routines\/.+/);
  await expect(page.getByText("0 of 1 done")).toBeVisible();

  await page.getByRole("checkbox", { name: "Mark as done" }).click();

  await expect(page.getByText("1 of 1 done")).toBeVisible();
  await expect(page.getByText(itemTitle, { exact: true })).toHaveClass(/line-through/);
});
