import { test as setup, expect } from "@playwright/test";
import path from "node:path";

// Standard Playwright auth-reuse pattern: log in once through the real
// /login form, then save the session so the domain specs start already
// authenticated instead of logging in per test.
const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("e2e/auth.setup.ts: missing E2E_EMAIL/E2E_PASSWORD in .env.local");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL("/todos");
  await page.context().storageState({ path: authFile });
});
