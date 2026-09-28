import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "node:path";
import { logoutAccountEmail } from "./load-env";

// Phase 8.2a — the account menu in the sidebar footer replaces the Settings nav item
// and the nav theme switch.

function menuTrigger(page: Page) {
  return page.getByRole("button", { name: "Account menu" });
}

async function openMenu(page: Page) {
  await menuTrigger(page).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

// A session of its own, so refreshing its token never touches the shared storage
// state the other specs run on.
async function freshSession(browser: Browser, email = process.env.E2E_EMAIL!) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/today");
  return { context, page };
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the sidebar has no Settings item and no theme switch", async ({ page }) => {
    await page.goto("/tasks");
    const sidebar = page.locator("#app-sidebar");
    await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Dark", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: /switch to (dark|light) theme/i })).toHaveCount(0);
  });

  test("opens to the right of the sidebar, bottom-aligned, with the account header and items", async ({ page }) => {
    await page.goto("/tasks");
    const trigger = menuTrigger(page);
    await expect(trigger).toContainText(process.env.E2E_EMAIL!);
    const menu = await openMenu(page);

    await expect(menu).toContainText(process.env.E2E_EMAIL!);
    for (const item of ["Profile", "Preferences", "Recycle Bin", "Log out"]) {
      await expect(menu.getByRole("menuitem", { name: item })).toBeVisible();
    }

    const sidebar = (await page.locator("#app-sidebar").boundingBox())!;
    const box = (await menu.boundingBox())!;
    const triggerBox = (await trigger.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width);
    expect(Math.abs(box.y + box.height - (triggerBox.y + triggerBox.height))).toBeLessThanOrEqual(2);
  });

  test("is keyboard navigable and closes on Esc and outside click", async ({ page }) => {
    await page.goto("/tasks");
    await menuTrigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Preferences" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Recycle Bin" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Log out" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(menuTrigger(page)).toBeFocused();

    // Outside click: the open menu shields the page, so click empty space by position.
    await openMenu(page);
    await page.mouse.click(700, 400);
    await expect(page.getByRole("menu")).toBeHidden();

    // Enter on an item follows it.
    await menuTrigger(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/preferences");
  });

  test("each item leads to its page", async ({ page }) => {
    await page.goto("/tasks");
    for (const [item, url, heading] of [
      ["Profile", "/profile", "Profile"],
      ["Preferences", "/preferences", "Preferences"],
      ["Recycle Bin", "/recycle-bin", "Recycle Bin"],
    ] as const) {
      const menu = await openMenu(page);
      await menu.getByRole("menuitem", { name: item }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
    await expect(page.getByText("Recycle Bin arrives in the next stage")).toBeVisible();
  });

  test("collapsed: the trigger is the avatar alone, with a tooltip", async ({ page }) => {
    await page.goto("/tasks");
    await page.evaluate(() => window.localStorage.setItem("life-os-sidebar", "collapsed"));
    await page.reload();

    const trigger = menuTrigger(page);
    await expect(trigger.getByText(process.env.E2E_EMAIL!)).toBeHidden();
    await trigger.hover();
    // Base UI tooltips carry no tooltip role; the popup is found by its slot.
    await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible();

    const menu = await openMenu(page);
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await page.evaluate(() => window.localStorage.removeItem("life-os-sidebar"));
  });
});

test("mobile: the menu opens below the trigger in the top bar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tasks");
  const trigger = menuTrigger(page);
  const menu = await openMenu(page);

  const triggerBox = (await trigger.boundingBox())!;
  const box = (await menu.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});

test("/settings redirects permanently to /preferences", async ({ page }) => {
  const response = await page.request.get("/settings", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe("/preferences");

  await page.goto("/settings");
  await expect(page).toHaveURL("/preferences");
});

test.describe("on the empty account", () => {
  // The timezone is account-wide state other specs' dates depend on, so change it
  // on the account that holds no data rather than the main one.
  test.use({ storageState: path.join(__dirname, ".auth/empty-user.json") });

  test("Preferences holds the theme switch and the timezone", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("life-os-theme", "light"));
    await page.goto("/preferences");
    // The select saves from React's onChange, so let the page hydrate first.
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const timezone = page.getByRole("combobox", { name: "Timezone" });
    const saved = await timezone.inputValue();
    await timezone.selectOption("Asia/Tokyo");
    await expect(page.getByText("Timezone saved")).toBeVisible();
    await page.reload();
    await expect(timezone).toHaveValue("Asia/Tokyo");
    await page.waitForLoadState("networkidle");
    await timezone.selectOption(saved);
    await expect(page.getByText("Timezone saved").first()).toBeVisible();
  });
});

test("Profile edits the display name, which the menu then shows", async ({ browser }) => {
  const { context, page } = await freshSession(browser);
  const name = `E2E Tester ${Date.now()}`;

  await page.goto("/profile");
  await expect(page.getByLabel("Email")).toHaveValue(process.env.E2E_EMAIL!);
  // Save only enables once React has hydrated the form; a fill before that can be
  // overwritten, so retry until the typed value sticks and Save is live.
  const input = page.getByLabel("Display name");
  const save = page.getByRole("button", { name: "Save" });
  await expect(async () => {
    await input.fill(name);
    await expect(input).toHaveValue(name, { timeout: 1000 });
    await expect(save).toBeEnabled({ timeout: 1000 });
  }).toPass();
  await save.click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await expect(menuTrigger(page)).toContainText(name);

  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue(name);
  await context.close();
});

test("Log out from the menu signs out and lands on /login", async ({ browser }) => {
  // Its own account: signing out ends every session of the account (load-env.ts).
  const { context, page } = await freshSession(browser, logoutAccountEmail());

  const menu = await openMenu(page);
  await menu.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.goto("/tasks");
  await expect(page).toHaveURL("/login");
  await context.close();
});
