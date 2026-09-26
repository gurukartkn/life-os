import { expect, type Page } from "@playwright/test";

// Exercises are created from the Exercises screen's New exercise modal.
export async function addExercise(page: Page, name: string): Promise<void> {
  await page.goto("/fitness/exercises");
  await page.getByRole("button", { name: "New exercise" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Save exercise" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

// Builds a workout on the editor from exercises picked in the Add exercise picker.
export async function createWorkout(page: Page, name: string, exercises: string[]): Promise<void> {
  await page.goto("/fitness/workouts/new");
  await page.getByLabel("Workout name").fill(name);
  for (const exercise of exercises) {
    await page.getByRole("button", { name: "Add exercise" }).click();
    await page.getByLabel("Search exercises").fill(exercise);
    await page.getByRole("checkbox", { name: new RegExp(exercise) }).check();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Save workout" }).click();
  // A generous timeout: dev mode compiles the route on its first hit.
  await expect(page).toHaveURL("/fitness/workouts", { timeout: 20_000 });
}

export function workoutRow(page: Page, name: string) {
  return page.locator('[data-slot="workout-row"]', { hasText: name });
}
