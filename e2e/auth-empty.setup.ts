import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { emptyAccountEmail } from "./load-env";

// Same pattern as auth.setup.ts, for the second, always-empty account that
// specs use to check "no data yet" behaviour. Specs opt in with
// test.use({ storageState: EMPTY_ACCOUNT_STATE }).
const authFile = path.join(__dirname, ".auth/empty-user.json");

setup("authenticate empty account", async ({ page }) => {
  const password = process.env.E2E_PASSWORD;
  if (!process.env.E2E_EMAIL || !password) {
    throw new Error("e2e/auth-empty.setup.ts: missing E2E_EMAIL/E2E_PASSWORD in .env.local");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(emptyAccountEmail());
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL("/tasks");
  await page.context().storageState({ path: authFile });
});
