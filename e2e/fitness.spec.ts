import { test, expect } from "@playwright/test";
import { addExercise, createWorkout, workoutRow } from "./fitness-helpers";

// Stage 3 checkpoint: the full "log a workout" flow — add an exercise, build a workout
// from it, start a session, log a set, finish (docs/08-implementation-plan.md).
test("create a workout and log a full set", async ({ page }) => {
  const exerciseName = `Bench Press ${Date.now()}`;
  const workoutName = `Push Day ${Date.now()}`;

  await addExercise(page, exerciseName);
  await createWorkout(page, workoutName, [exerciseName]);

  await workoutRow(page, workoutName).getByRole("button", { name: `Start ${workoutName}` }).click();

  await expect(page).toHaveURL(/\/fitness\/log\/.+/, { timeout: 20_000 });
  await expect(page.getByText("In progress")).toBeVisible();
  await page.getByLabel("Set 1 weight").fill("135");
  await page.getByLabel("Set 1 reps").fill("8");
  // A set saves itself when focus leaves its row.
  await page.getByRole("heading", { name: exerciseName }).click();
  await page.getByRole("button", { name: "Finish workout" }).click();

  // Finishing lands on the read-only past log.
  await expect(page).toHaveURL(/\/fitness\/logs\/.+/, { timeout: 20_000 });
  // The heading specifically: Next.js's route announcer also echoes the page title.
  await expect(page.getByRole("heading", { name: workoutName, exact: true })).toBeVisible();
  const card = page.getByRole("region", { name: exerciseName });
  await expect(card.getByText("135 lb")).toBeVisible();
  await expect(card.getByRole("cell", { name: "8", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Workouts" }).first().click();
  await expect(page).toHaveURL("/fitness/workouts");
  await expect(workoutRow(page, workoutName).getByText(/Last done/)).toBeVisible();
});

test("the Fitness section opens on Workouts, with its screens in the sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/fitness");

  await expect(page).toHaveURL("/fitness/workouts");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Workouts" })).toHaveAttribute("aria-current", "page");
  for (const [label, path] of [
    ["Exercises", "/fitness/exercises"],
    ["Muscle Groups", "/fitness/muscle-groups"],
    ["Equipment", "/fitness/equipment"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible();
  }
});
