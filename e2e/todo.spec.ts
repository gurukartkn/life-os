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

  await page.getByRole("checkbox", { name: "Mark as done" }).first().click();

  await expect(row).toHaveClass(/line-through/);
  await expect(page.getByRole("checkbox", { name: "Mark as not done" }).first()).toBeVisible();
});
