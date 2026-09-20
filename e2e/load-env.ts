import fs from "node:fs";
import path from "node:path";

// @next/env's loadEnvConfig deliberately skips .env.local when
// NODE_ENV === "test" (mirroring CRA), and Playwright sets NODE_ENV=test —
// so it can never see our Supabase/e2e credentials. This is a minimal,
// NODE_ENV-agnostic stand-in used only for the e2e suite.
// A second dev test account that is kept empty, for tests about the no-data state
// (e.g. Export data is hidden). Derived from E2E_EMAIL by plus-addressing so no
// extra env var is needed; the dev project has email confirmations off.
export function emptyAccountEmail(): string {
  const [local, domain] = (process.env.E2E_EMAIL ?? "").split("@");
  return `${local}+empty@${domain}`;
}

export function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    if (process.env[key] === undefined) process.env[key] = value;
  }
}
