import { test, expect } from "@playwright/test";
import path from "node:path";

const SLOW = { timeout: 15_000 };

test("the sidebar opens Today first and highlights it", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/today", SLOW);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link").first()).toHaveAccessibleName("Today");
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
});

test.describe("an account with no data", () => {
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("Today shows every module's section with its empty state", async ({ page }) => {
    await page.goto("/today");
    for (const [name, empty] of [
      ["Tasks", "Nothing due today."],
      ["Routines", "No routines yet."],
      ["Fitness", "No workout logged today."],
      ["Goals", "No active goals."],
      ["Spending this month", "No spending tracked yet."],
    ] as const) {
      const card = page.getByRole("region", { name });
      await expect(card).toBeVisible(SLOW);
      await expect(card).toContainText(empty);
    }
  });
});
