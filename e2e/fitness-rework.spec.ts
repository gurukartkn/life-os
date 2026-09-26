import { test, expect } from "@playwright/test";
import { addExercise, createWorkout, workoutRow } from "./fitness-helpers";

// v2 Stage 3 checkpoint, on the hi-fi screens: an exercise tagged through the
// search-or-create fields (creating tags inline), the Muscle Groups screen, and editing
// a workout without losing its identity.

test("tags a new exercise with an inline-created muscle group and equipment", async ({ page }) => {
  const stamp = Date.now();
  const exerciseName = `Cable Fly ${stamp}`;
  const muscleGroupName = `Chest ${stamp}`;
  const equipmentName = `Cable machine ${stamp}`;

  await page.goto("/fitness/exercises");
  await page.getByRole("button", { name: "New exercise" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(exerciseName);

  await dialog.getByRole("combobox", { name: "Muscle groups" }).fill(muscleGroupName);
  await expect(page.getByRole("option", { name: new RegExp(`Create “${muscleGroupName}”`) })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Muscle groups" }).press("Enter");
  await expect(dialog.getByRole("button", { name: `Remove ${muscleGroupName}` })).toBeVisible();

  await dialog.getByRole("combobox", { name: "Equipment" }).fill(equipmentName);
  await dialog.getByRole("combobox", { name: "Equipment" }).press("Enter");
  await expect(dialog.getByRole("button", { name: `Remove ${equipmentName}` })).toBeVisible();

  await dialog.getByRole("button", { name: "Save exercise" }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole("row", { name: new RegExp(exerciseName) });
  await expect(row.getByText(muscleGroupName)).toBeVisible();
  await expect(row.getByText(equipmentName)).toBeVisible();
});

test("adds, renames, archives and restores a muscle group", async ({ page }) => {
  const originalName = `Lats ${Date.now()}`;
  const renamedName = `${originalName} (wide grip)`;

  await page.goto("/fitness/muscle-groups");
  await page.getByRole("button", { name: "Add muscle group" }).first().click();
  await page.getByLabel("New muscle group").fill(originalName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(originalName, { exact: true })).toBeVisible();

  // The same name again, in another case, is refused before it reaches the server.
  await page.getByLabel("New muscle group").fill(originalName.toUpperCase());
  await expect(page.getByText(/already exists\. Names are unique, ignoring case\./)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("button", { name: `Rename ${originalName}` }).click();
  const renameInput = page.getByRole("textbox", { name: `Rename ${originalName}` });
  await renameInput.fill(renamedName);
  await renameInput.press("Enter");
  await expect(page.getByText(renamedName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Archive ${renamedName}` }).click();
  await page.getByRole("button", { name: /^Archived \(\d+\)/ }).click();
  await page.getByRole("button", { name: `Restore ${renamedName}` }).click();
  await expect(page.getByRole("button", { name: `Rename ${renamedName}` })).toBeVisible();
});

test("edits a workout's name and exercises without recreating it", async ({ page }) => {
  const stamp = Date.now();
  const exerciseOne = `Overhead Press ${stamp}`;
  const exerciseTwo = `Lateral Raise ${stamp}`;
  const workoutName = `Shoulder Day ${stamp}`;
  const renamedWorkout = `${workoutName} (edited)`;

  await addExercise(page, exerciseOne);
  await addExercise(page, exerciseTwo);
  await createWorkout(page, workoutName, [exerciseOne]);

  await workoutRow(page, workoutName).getByRole("link", { name: `Edit ${workoutName}` }).click();
  await expect(page).toHaveURL(/\/fitness\/workouts\/.+\/edit/, { timeout: 20_000 });

  await page.getByLabel("Workout name").fill(renamedWorkout);
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByLabel("Search exercises").fill(exerciseTwo);
  await page.getByRole("checkbox", { name: new RegExp(exerciseTwo) }).check();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Move ${exerciseTwo} up` }).click();
  await page.getByRole("button", { name: "Save workout" }).click();

  await expect(page).toHaveURL("/fitness/workouts", { timeout: 20_000 });
  await expect(workoutRow(page, renamedWorkout).getByText(/^2 exercises/)).toBeVisible();

  await workoutRow(page, renamedWorkout).getByRole("link", { name: `Edit ${renamedWorkout}` }).click();
  await expect(page.locator('[data-slot="workout-editor-row"]').first()).toContainText(exerciseTwo);
});
