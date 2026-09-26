import { test, expect, type Page } from "@playwright/test";

// Backlog #5 — collapsible sidebar (desktop; the mobile top bar is unchanged).
test.use({ viewport: { width: 1280, height: 800 } });

async function sidebarWidth(page: Page) {
  return page.locator("#app-sidebar").evaluate((el) => Math.round(el.getBoundingClientRect().width));
}

// Start every test expanded. Cleared once (not via an init script, which would
// also wipe the stored choice on the reloads some tests do on purpose).
async function openExpanded(page: Page) {
  await page.goto("/tasks");
  await page.evaluate(() => window.localStorage.removeItem("life-os-sidebar"));
  await page.reload();
}

test("collapses to an icon rail and expands again", async ({ page }) => {
  await openExpanded(page);
  await expect.poll(() => sidebarWidth(page)).toBe(216);
  await expect(page.locator("#app-sidebar").getByText("Fitness", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();

  await expect.poll(() => sidebarWidth(page)).toBe(64);
  await expect(page.locator("#app-sidebar").getByText("Fitness", { exact: true })).toBeHidden();
  // Items stay reachable by name.
  await expect(page.getByRole("link", { name: "Fitness" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect.poll(() => sidebarWidth(page)).toBe(216);
});

test("stays collapsed across a reload and while navigating", async ({ page }) => {
  await openExpanded(page);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect.poll(() => sidebarWidth(page)).toBe(64);

  await page.reload();
  expect(await sidebarWidth(page)).toBe(64);

  await page.getByRole("link", { name: "Fitness" }).click();
  await expect(page).toHaveURL(/\/fitness/);
  expect(await sidebarWidth(page)).toBe(64);
});

test("the toggle works from the keyboard", async ({ page }) => {
  await openExpanded(page);

  await page.getByRole("button", { name: "Collapse sidebar" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeFocused();
  await expect.poll(() => sidebarWidth(page)).toBe(64);
});
