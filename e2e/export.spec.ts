import path from "node:path";
import { test, expect } from "@playwright/test";

// Backlog #19 — Export data is offered only when there is something to export.

test.describe("account with no data", () => {
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("hides Export data, then shows it once the first todo exists", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export data" })).toHaveCount(0);

    await page.getByLabel("Todo title").fill(`First todo ${Date.now()}`);
    await page.getByRole("button", { name: "Add todo" }).click();

    await expect(page.getByRole("button", { name: "Export data" })).toBeVisible();
  });
});

test.describe("account with data", () => {
  test("shows Export data", async ({ page }) => {
    await page.goto("/todos");
    await page.getByLabel("Todo title").fill(`Export check ${Date.now()}`);
    await page.getByRole("button", { name: "Add todo" }).click();

    await expect(page.getByRole("button", { name: "Export data" })).toBeVisible();
  });
});
