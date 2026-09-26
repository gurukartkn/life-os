import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addTask, openAddTask, taskRow } from "./task-helpers";

// v2 Stage 1: "the user can switch between light and dark on every screen" — so
// every screen, and the states that change text colour (overdue and completed
// tasks, validation errors, the open calendar), must meet WCAG AA text contrast
// in both themes (docs/05-design-system.md, v2 Amendment §F and §H).

const APP_SCREENS = [
  "/tasks",
  "/fitness",
  "/fitness?tab=exercises",
  "/fitness/workouts/new",
  "/routines",
  "/routines/new",
  "/goals",
  "/settings",
];
const AUTH_SCREENS = ["/login", "/signup"];

async function contrastViolations(page: Page) {
  // Let colour transitions and enter animations finish: axe would otherwise measure a
  // half-blended colour (e.g. a button still easing to its hover or enabled state).
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${node.target.join(" ")} — ${node.any[0]?.message}`)
  );
}

async function useTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => window.localStorage.setItem("life-os-theme", value), theme);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const path of APP_SCREENS) {
      test(`${path} meets AA text contrast`, async ({ page }) => {
        await useTheme(page, theme);
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.locator("main").waitFor();

        expect(await contrastViolations(page)).toEqual([]);
      });
    }

    test("Tasks with an overdue and a completed task, the modal with an error and the open calendar", async ({ page }) => {
      const stamp = Date.now();
      await useTheme(page, theme);
      await page.goto("/tasks");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      // An overdue task (previous month) and a completed one.
      let dialog = await openAddTask(page);
      await dialog.getByLabel("Title").fill(`Overdue sample ${stamp}`);
      await dialog.getByRole("button", { name: "Due date" }).click();
      await page.getByRole("button", { name: /previous month/i }).click();
      await page.getByRole("button", { name: /\b15th, \d{4}/ }).click();
      await dialog.getByRole("button", { name: "Add task" }).click();
      await expect(taskRow(page, `Overdue sample ${stamp}`)).toContainText("Overdue", { timeout: 20_000 });

      await addTask(page, `Done sample ${stamp}`);
      const done = taskRow(page, `Done sample ${stamp}`);
      await done.getByRole("checkbox", { name: "Mark as done" }).click();
      await expect(done.getByRole("checkbox", { name: "Mark as not done" })).toBeVisible({ timeout: 20_000 });

      expect(await contrastViolations(page)).toEqual([]);

      // The modal over the scrim, with a validation error.
      dialog = await openAddTask(page);
      await dialog.getByRole("button", { name: "Add task" }).click();
      await expect(dialog.getByText("Enter a title.")).toBeVisible();
      expect(await contrastViolations(page)).toEqual([]);

      // Open calendar (weekday labels, outside days, selected and today cells).
      await dialog.getByRole("button", { name: "Due date" }).click();
      await expect(page.getByRole("grid")).toBeVisible();
      // The popover fades in; measure once it is fully opaque, not mid-animation.
      await expect(page.locator('[data-slot="popover-content"]')).toHaveCSS("opacity", "1");
      expect(await contrastViolations(page)).toEqual([]);
    });

    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      for (const path of AUTH_SCREENS) {
        test(`${path} meets AA text contrast`, async ({ page }) => {
          await useTheme(page, theme);
          await page.goto(path);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

          expect(await contrastViolations(page)).toEqual([]);
        });
      }
    });
  });
}
