import { test, expect } from "@playwright/test";

// Stage 3 checkpoint: the full "log a workout" flow — add an exercise,
// build a workout from it, start a log, save a set, finish
// (docs/08-implementation-plan.md).
test("create a workout and log a full set", async ({ page }) => {
  const exerciseName = `Bench Press ${Date.now()}`;
  const workoutName = `Push Day ${Date.now()}`;

  await page.goto("/fitness?tab=exercises");
  await page.getByLabel("Exercise name").fill(exerciseName);
  await page.getByRole("button", { name: "Add exercise" }).click();
  await expect(page.getByText(exerciseName, { exact: true })).toBeVisible();

  await page.goto("/fitness/workouts/new");
  await page.getByLabel("Name").fill(workoutName);
  await page.getByLabel("Exercise 1", { exact: true }).selectOption({ label: exerciseName });
  await page.getByRole("button", { name: "Create workout" }).click();

  await expect(page).toHaveURL("/fitness");
  const workoutCard = page
    .getByText(workoutName, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await workoutCard.getByRole("button", { name: "Start workout" }).click();

  await expect(page).toHaveURL(/\/fitness\/log\/.+/);
  await page.getByLabel("Set 1 weight").fill("135");
  await page.getByLabel("Set 1 reps").fill("8");
  await page.getByRole("button", { name: "Save set 1" }).click();
  await expect(page.getByRole("button", { name: "Save set 1" })).toHaveClass(/bg-teal/);

  await page.getByRole("link", { name: "Finish workout" }).click();

  await expect(page).toHaveURL("/fitness");
  const loggedCard = page
    .getByText(workoutName, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await expect(loggedCard.getByText(/Last logged/)).toBeVisible();
});
