import { test, expect } from "@playwright/test";

// Backlog #1 — logged-out screens, so start without the saved session.
test.use({ storageState: { cookies: [], origins: [] } });

// Backlog #6 moved the per-request session check to local JWT verification; the
// redirects it drives must be unchanged.
for (const path of ["/tasks", "/fitness", "/routines", "/goals"]) {
  test(`signed-out visit to ${path} is redirected to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("a signed-in user visiting /login is sent to /tasks", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/tasks$/);
  await context.close();
});

for (const path of ["/login", "/signup"]) {
  test(`${path}: password can be shown and hidden`, async ({ page }) => {
    await page.goto(path);

    const password = page.getByLabel("Password", { exact: true });
    await password.fill("correct horse battery");
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("correct horse battery");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");

    // The toggle is not a submit: still on the same page, no error shown.
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  });
}
