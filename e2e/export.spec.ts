import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

// Backlog #19 — Export data is offered only when there is something to export.

test.describe("account with no data", () => {
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("hides Export data, then shows it once the first task exists", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export data" })).toHaveCount(0);

    await page.getByLabel("Task title").fill(`First task ${Date.now()}`);
    await page.getByRole("button", { name: "New task" }).click();

    await expect(page.getByRole("button", { name: "Export data" })).toBeVisible();
  });
});

test.describe("account with data", () => {
  test("shows Export data", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByLabel("Task title").fill(`Export check ${Date.now()}`);
    await page.getByRole("button", { name: "New task" }).click();

    await expect(page.getByRole("button", { name: "Export data" })).toBeVisible();
  });

  // v2 Stage 2 — the export's todos key became tasks.
  test("the exported file has a tasks key and no todos key", async ({ page }) => {
    const title = `Export contents ${Date.now()}`;
    await page.goto("/tasks");
    await page.getByLabel("Task title").fill(title);
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export data" }).click(),
    ]);
    const exported = JSON.parse(fs.readFileSync((await download.path())!, "utf8"));

    expect(exported).not.toHaveProperty("todos");
    expect(exported.tasks.map((task: { title: string }) => task.title)).toContain(title);
  });
});
