import { test, expect, type Page } from "@playwright/test";

// Dark palette + theme switch (v2 Stage 1). Colours are the design-system tokens:
// surface-050 light #f9fbfc / dark #0f1014.
const LIGHT_PAGE_BG = "rgb(249, 251, 252)";
const DARK_PAGE_BG = "rgb(15, 16, 20)";

async function pageBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function forceLight(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("life-os-theme", "light"));
}

test.describe("signed in", () => {
  // Phase 8.2a: the switch lives on Preferences (it left the sidebar); the chosen
  // theme applies on every screen.
  test("switch to dark and back on Preferences, and every screen follows", async ({ page }) => {
    // Set once, not with an init script, which would reset the choice on every load.
    await page.goto("/preferences");
    await page.evaluate(() => window.localStorage.setItem("life-os-theme", "light"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await pageBackground(page)).toBe(LIGHT_PAGE_BG);

    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await pageBackground(page)).toBe(DARK_PAGE_BG);

    for (const path of ["/tasks", "/fitness", "/routines", "/goals", "/profile"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await pageBackground(page)).toBe(DARK_PAGE_BG);
    }

    await page.goto("/preferences");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await pageBackground(page)).toBe(LIGHT_PAGE_BG);
  });

  test("the choice survives a reload and applies before first paint", async ({ page }) => {
    // Start from an explicit light choice (set once — an init script would also
    // overwrite the stored choice on the reload below).
    await page.goto("/preferences");
    await page.evaluate(() => window.localStorage.setItem("life-os-theme", "light"));
    await page.reload();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    expect(await page.evaluate(() => window.localStorage.getItem("life-os-theme"))).toBe("dark");

    // Record the theme the moment the document starts parsing, before any body paint.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __themeAtDcl: string | null }).__themeAtDcl =
          document.documentElement.getAttribute("data-theme");
      });
    });
    await page.reload();

    expect(await page.evaluate(() => (window as unknown as { __themeAtDcl: string }).__themeAtDcl)).toBe("dark");
    await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login and sign-up can switch theme", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await forceLight(page);
      await page.goto(path);
      await page.getByRole("button", { name: "Switch to dark theme" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await pageBackground(page)).toBe(DARK_PAGE_BG);
    }
  });

  test("first visit follows the OS colour scheme", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark", storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await context.close();
  });
});
