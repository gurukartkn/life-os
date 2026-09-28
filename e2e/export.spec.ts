import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { addTask } from "./task-helpers";

// Backlog #19 — Export data is offered only when there is something to export. It
// lives on Preferences › Data (Settings › Data before Phase 8.2a); with no data the Data card is not rendered at all.


test.describe("account with no data", () => {
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("has no Data card, then shows it once the first task exists", async ({ page }) => {
    await page.goto("/preferences");
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Export JSON" })).toHaveCount(0);

    await addTask(page, `First task ${Date.now()}`);
    await page.goto("/preferences");

    await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  });
});

test.describe("account with data", () => {
  // v2 Stage 2 — the export's todos key became tasks.
  test("the exported file has a tasks key and no todos key", async ({ page }) => {
    const title = `Export contents ${Date.now()}`;
    await addTask(page, title);
    await page.goto("/preferences");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export JSON" }).click(),
    ]);
    const exported = JSON.parse(fs.readFileSync((await download.path())!, "utf8"));

    expect(exported).not.toHaveProperty("todos");
    expect(exported.tasks.map((task: { title: string }) => task.title)).toContain(title);
  });
});
