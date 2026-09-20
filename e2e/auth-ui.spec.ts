import { test, expect } from "@playwright/test";

// Backlog #1 — logged-out screens, so start without the saved session.
test.use({ storageState: { cookies: [], origins: [] } });

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
