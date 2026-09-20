import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { loadEnvLocal } from "./e2e/load-env";

// So E2E_EMAIL/E2E_PASSWORD and the Supabase keys are available here and in
// every spec/setup file (see e2e/load-env.ts for why this isn't @next/env).
loadEnvLocal();

// Playwright runs e2e checkpoints against the dev Supabase project
// (docs/08-implementation-plan.md, docs/04-backend-architecture.md §6).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: path.join(__dirname, "e2e/.auth/user.json") },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // `next dev` appends a generated "agent rules" block to CLAUDE.md whenever it detects an AI
    // coding agent from these variables. Blanking them for the test server keeps the file clean.
    env: { AI_AGENT: "", CLAUDECODE: "", CLAUDE_CODE: "", CLAUDE_CODE_IS_COWORK: "" },
  },
});
