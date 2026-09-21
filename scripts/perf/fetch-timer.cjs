// Perf harness only — never imported by app code. Preloaded into `next start`
// with NODE_OPTIONS="--require ./scripts/perf/fetch-timer.cjs" and PERF_LOG=<file>.
// Logs one JSON line per outgoing Supabase request: epoch ms, pid, method,
// URL *path only* (no query string, so no filter values), duration and status.
const fs = require("node:fs");

const logPath = process.env.PERF_LOG;

if (logPath && typeof globalThis.fetch === "function" && !globalThis.__perfFetchPatched) {
  globalThis.__perfFetchPatched = true;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function perfFetch(input, init) {
    let pathname = null;
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw);
      if (url.host.endsWith(".supabase.co")) pathname = url.pathname;
    } catch {
      // Not a parseable absolute URL — pass through untouched.
    }
    if (!pathname) return originalFetch(input, init);

    const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";
    const startedAt = Date.now();
    const t0 = performance.now();
    let status = "error";
    try {
      const response = await originalFetch(input, init);
      status = response.status;
      return response;
    } finally {
      const line = JSON.stringify({
        t: startedAt,
        pid: process.pid,
        method,
        path: pathname,
        ms: Math.round((performance.now() - t0) * 10) / 10,
        status,
      });
      fs.appendFileSync(logPath, line + "\n");
    }
  };
}
