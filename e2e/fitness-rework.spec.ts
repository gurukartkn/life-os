import { test, expect } from "@playwright/test";

// v2 Stage 3 checkpoint: the fitness-rework screens — an exercise tagged through the
// muscle group/equipment pickers (creating one inline), the Muscle Groups/Equipment
// submodules, and editing a workout without losing its identity.

test("tags a new exercise with an inline-created muscle group and equipment", async ({ page }) => {
  const exerciseName = `Cable Fly ${Date.now()}`;
  const muscleGroupName = `Chest ${Date.now()}`;
  const equipmentName = `Cable machine ${Date.now()}`;

  await page.goto("/fitness?tab=exercises");

  await page.getByLabel("New muscle groups").fill(muscleGroupName);
  await page.getByLabel("Add muscle groups").click();
  const muscleGroupChip = page.getByRole("button", { name: muscleGroupName });
  await expect(muscleGroupChip).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("New equipment").fill(equipmentName);
  await page.getByLabel("Add equipment").click();
  const equipmentChip = page.getByRole("button", { name: equipmentName });
  await expect(equipmentChip).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Exercise name").fill(exerciseName);
  await page.getByRole("button", { name: "Add exercise" }).click();

  const exerciseRow = page.locator("div.rounded-md.border", { hasText: exerciseName });
  await expect(exerciseRow).toBeVisible();
  await expect(exerciseRow.getByText(muscleGroupName)).toBeVisible();
  await expect(exerciseRow.getByText(equipmentName)).toBeVisible();
});

test("renames and archives a muscle group from the submodule manager", async ({ page }) => {
  const originalName = `Lats ${Date.now()}`;
  const renamedName = `${originalName} (wide grip)`;

  await page.goto("/fitness?tab=exercises");
  await page.getByRole("button", { name: /manage muscle groups/i }).click();

  // The Muscle Groups manager's own "add one" input, distinct from the exercise
  // form's tag picker input just above it, which shares the same accessible name.
  const manager = page.getByLabel("Muscle groups catalog");
  await manager.getByLabel("New muscle groups").fill(originalName);
  await manager.getByLabel("Add muscle groups").click();
  // Also appears as a fresh, unselected chip in the exercise form's picker above (the
  // create action revalidates the page), so scope to the manager to keep this specific.
  await expect(manager.getByText(originalName, { exact: true })).toBeVisible();

  await page.getByLabel(`Rename ${originalName}`).click();
  const renameInput = page.getByLabel(`Rename ${originalName}`);
  await renameInput.fill(renamedName);
  await renameInput.press("Enter");
  await expect(manager.getByText(renamedName, { exact: true })).toBeVisible();

  await page.getByLabel(`Archive ${renamedName}`).click();
  // Archiving flips the row's own button from Archive to Restore, and it keeps the row.
  await expect(page.getByLabel(`Restore ${renamedName}`)).toBeVisible();
  await expect(manager.getByText(renamedName, { exact: true })).toBeVisible();
});

test("edits a workout's name and exercises without recreating it", async ({ page }) => {
  const exerciseOne = `Overhead Press ${Date.now()}`;
  const exerciseTwo = `Lateral Raise ${Date.now()}`;
  const workoutName = `Shoulder Day ${Date.now()}`;
  const renamedWorkout = `${workoutName} (edited)`;

  await page.goto("/fitness?tab=exercises");
  for (const name of [exerciseOne, exerciseTwo]) {
    await page.getByLabel("Exercise name").fill(name);
    await page.getByRole("button", { name: "Add exercise" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  await page.goto("/fitness/workouts/new");
  await page.getByLabel("Name").fill(workoutName);
  await page.getByLabel("Exercise 1", { exact: true }).selectOption({ label: exerciseOne });
  await page.getByRole("button", { name: "Create workout" }).click();
  await expect(page).toHaveURL("/fitness");

  const workoutCard = page
    .getByText(workoutName, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await workoutCard.getByLabel("Edit workout").click();

  // A generous timeout: dev mode compiles this route on its first hit.
  await expect(page).toHaveURL(/\/fitness\/workouts\/.+\/edit/, { timeout: 20_000 });
  await page.getByLabel("Name").fill(renamedWorkout);
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByLabel("Exercise 2", { exact: true }).selectOption({ label: exerciseTwo });
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/fitness");
  const editedCard = page
    .getByText(renamedWorkout, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await expect(editedCard).toBeVisible();
  await expect(editedCard.getByText("2 exercises")).toBeVisible();
});
