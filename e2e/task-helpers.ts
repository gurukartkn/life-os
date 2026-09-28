import { expect, type Locator, type Page } from "@playwright/test";

// Tasks are added from the header's Add task button through the create dialog.
export async function openAddTask(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add task" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New task" });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function addTask(page: Page, title: string): Promise<void> {
  if (!page.url().endsWith("/tasks")) await page.goto("/tasks");
  const dialog = await openAddTask(page);
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

// Its own row: other specs share this account and leave open tasks on the page.
export function taskRow(page: Page, title: string): Locator {
  return page.locator('[data-slot="task-row"]', { hasText: title });
}

// Clicking a row opens its drawer (?view=task:<id>).
export async function openTaskDrawer(page: Page, title: string): Promise<Locator> {
  await taskRow(page, title).getByRole("button", { name: title, exact: true }).click();
  const drawer = page.locator('[data-slot="entity-drawer"]');
  await expect(drawer.getByRole("heading", { name: title })).toBeVisible();
  await expect(page).toHaveURL(/[?&]view=task:[0-9a-f-]{36}/);
  return drawer;
}
