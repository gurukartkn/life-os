// Perf harness only — measures page switching and todo filter tabs against a
// running production build (`next build && next start`).
//
//   $env:PERF_LOG="perf-out/server.log"; $env:NODE_OPTIONS="--require ./scripts/perf/fetch-timer.cjs"
//   npm run start          # in one shell
//   node scripts/perf/measure.mjs --label=baseline-small --n=20 --rtt=0
//
// Scenarios: cold (full page loads), nav (sidebar click → destination h1),
// filters (todo tab click → URL + list settled), server (single non-prefetched
// document requests, correlated with the fetch-timer log so auth round trips
// and query time per route are attributable).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { loadEnvLocal, stats } from "./env.mjs";

loadEnvLocal();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base ?? "http://localhost:3000";
const N = Number(args.n ?? 20);
const RTT = Number(args.rtt ?? 0);
const LABEL = args.label ?? "run";
const LOG = args.log ?? "perf-out/server.log";
const OUT = args.out ?? `perf-out/${LABEL}.json`;
const SCENARIOS = (args.scenarios ?? "cold,nav,filters,server").split(",");

const SETTLE_MS = 500;

function serverCalls(t0, t1) {
  if (!fs.existsSync(LOG)) return { count: 0, auth: 0, authMs: 0, rest: 0, restMs: 0 };
  const rows = fs
    .readFileSync(LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((r) => r.t >= t0 - 2 && r.t <= t1);
  const auth = rows.filter((r) => r.path.startsWith("/auth/"));
  const rest = rows.filter((r) => r.path.startsWith("/rest/"));
  const sum = (xs) => xs.reduce((a, r) => a + r.ms, 0);
  return { count: rows.length, auth: auth.length, authMs: sum(auth), rest: rest.length, restMs: sum(rest) };
}

const INIT_SCRIPT = () => {
  window.__perf = { longtasks: [], events: [], shifts: [] };
  const observe = (type, extra, handler) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(handler)).observe({ type, buffered: true, ...extra });
    } catch {
      /* unsupported entry type */
    }
  };
  observe("longtask", {}, (e) => window.__perf.longtasks.push({ s: e.startTime, d: e.duration }));
  observe("event", { durationThreshold: 16 }, (e) => window.__perf.events.push({ s: e.startTime, d: e.duration }));
  observe("layout-shift", {}, (e) => {
    if (!e.hadRecentInput) window.__perf.shifts.push({ s: e.startTime, v: e.value });
  });
};

async function timedClick(page, clickSel, donePredicate) {
  return page.evaluate(
    ({ clickSel, donePredicate }) =>
      new Promise((resolve, reject) => {
        const el = document.querySelector(clickSel);
        if (!el) return reject(new Error(`no element for ${clickSel}`));
        const done = new Function(`return (${donePredicate});`);
        const t0 = performance.now();
        const epoch0 = Date.now();
        let feedbackMs = null;
        const timeout = setTimeout(() => {
          mo.disconnect();
          reject(new Error(`timeout waiting for ${donePredicate}`));
        }, 20000);
        const mo = new MutationObserver(() => {
          if (feedbackMs === null) feedbackMs = performance.now() - t0;
          if (done()) {
            mo.disconnect();
            clearTimeout(timeout);
            resolve({ contentMs: performance.now() - t0, feedbackMs, t0, epoch0, epoch1: Date.now() });
          }
        });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
        el.click();
      }),
    { clickSel, donePredicate }
  );
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/todos");
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(INIT_SCRIPT);
const page = await context.newPage();

// Track browser-side requests (RSC / document) for request counts and TTFB.
const requests = [];
const pending = new Map();
page.on("request", (req) => pending.set(req, req.headers()));
page.on("requestfinished", (req) => {
  const headers = pending.get(req) ?? {};
  pending.delete(req);
  const timing = req.timing();
  requests.push({
    url: req.url(),
    type: req.resourceType(),
    prefetch: Boolean(headers["next-router-prefetch"]),
    rsc: req.url().includes("_rsc="),
    start: timing.startTime,
    ttfb: timing.responseStart,
    end: timing.responseEnd,
  });
});

await login(page);
// RTT is *not* emulated here: Chrome's emulateNetworkConditions latency is only a floor and is
// hidden by a slow server. For RTT runs, point --base at scripts/perf/delay-proxy.mjs and
// pass the same value as --rtt so it is recorded in the results.

function requestsIn(epoch0, epoch1) {
  const inWindow = requests.filter((r) => r.start >= epoch0 - 5 && r.start <= epoch1 && !r.prefetch && (r.rsc || r.type === "document"));
  return {
    count: inWindow.length,
    rscTtfb: inWindow.filter((r) => r.rsc).map((r) => r.ttfb),
    rscTotal: inWindow.filter((r) => r.rsc).map((r) => r.end),
  };
}

const results = {};

// ---- cold: full document loads -------------------------------------------
async function firstRoutineHref() {
  await page.goto(`${BASE}/routines`);
  return page.locator('main a[href^="/routines/"]:not([href="/routines/new"])').first().getAttribute("href");
}
const routineHref = await firstRoutineHref();

if (SCENARIOS.includes("cold")) {
  const routes = { "/todos": "Today", "/fitness": "Fitness", "/routines": "Routines", [routineHref ?? "/routines"]: "routine-detail" };
  results.cold = {};
  for (const [route, name] of Object.entries(routes)) {
    const ttfb = [], fcp = [], load = [], wall = [];
    for (let i = 0; i < Math.min(N, 10) + 1; i++) {
      const t0 = Date.now();
      await page.goto(`${BASE}${route}`, { waitUntil: "load" });
      const wallMs = Date.now() - t0;
      const nav = await page.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0];
        const fcp = performance.getEntriesByName("first-contentful-paint")[0];
        return { ttfb: n.responseStart, load: n.loadEventEnd, fcp: fcp ? fcp.startTime : null };
      });
      if (i === 0) continue; // discard first (server/module warm-up)
      ttfb.push(nav.ttfb); load.push(nav.load); wall.push(wallMs);
      if (nav.fcp !== null) fcp.push(nav.fcp);
    }
    results.cold[name] = { ttfbMs: stats(ttfb), fcpMs: stats(fcp), loadMs: stats(load), wallMs: stats(wall) };
  }
}

// ---- nav: sidebar / card clicks -------------------------------------------
if (SCENARIOS.includes("nav")) {
  await page.goto(`${BASE}/todos`);
  await page.waitForTimeout(1000);
  const steps = [
    { name: "todos→fitness", sel: 'aside nav a[href="/fitness"]', done: `document.querySelector('h1')?.textContent?.trim() === 'Fitness'` },
    { name: "fitness→routines", sel: 'aside nav a[href="/routines"]', done: `document.querySelector('h1')?.textContent?.trim() === 'Routines'` },
    { name: "routines→routine-detail", sel: `main a[href="${routineHref}"]`, done: `location.pathname === '${routineHref}' && document.querySelector('h1')?.textContent?.trim().startsWith('perf routine')` },
    { name: "routine-detail→todos", sel: 'aside nav a[href="/todos"]', done: `document.querySelector('h1')?.textContent?.trim() === 'Today'` },
  ];
  const acc = Object.fromEntries(steps.map((s) => [s.name, { content: [], feedback: [], reqs: [], auth: [], authMs: [], rest: [], restMs: [], longtaskMs: [] }]));
  for (let cycle = 0; cycle < N + 1; cycle++) {
    for (const step of steps) {
      const r = await timedClick(page, step.sel, step.done);
      await page.waitForTimeout(SETTLE_MS);
      if (cycle === 0) continue; // discard first cycle
      const calls = serverCalls(r.epoch0, r.epoch1);
      const reqs = requestsIn(r.epoch0, r.epoch1);
      const a = acc[step.name];
      a.content.push(r.contentMs); a.feedback.push(r.feedbackMs); a.reqs.push(reqs.count);
      a.auth.push(calls.auth); a.authMs.push(calls.authMs); a.rest.push(calls.rest); a.restMs.push(calls.restMs);
    }
  }
  results.nav = Object.fromEntries(
    Object.entries(acc).map(([k, a]) => [
      k,
      { contentMs: stats(a.content), firstDomChangeMs: stats(a.feedback), browserRequests: stats(a.reqs), serverAuthCalls: stats(a.auth), serverAuthMs: stats(a.authMs), serverRestCalls: stats(a.rest), serverRestMs: stats(a.restMs) },
    ])
  );
}

// ---- filters: todo tabs ----------------------------------------------------
if (SCENARIOS.includes("filters")) {
  const expected = {};
  for (const [name, url] of [["all", "/todos"], ["active", "/todos?status=active"], ["completed", "/todos?status=completed"]]) {
    await page.goto(`${BASE}${url}`);
    expected[name] = await page.locator('[role="checkbox"]').count();
  }
  await page.goto(`${BASE}/todos`);
  await page.waitForTimeout(1000);
  const steps = [
    { name: "all→active", sel: 'a[href="/todos?status=active"]', done: `location.search === '?status=active' && document.querySelectorAll('[role="checkbox"]').length === ${expected.active}` },
    { name: "active→completed", sel: 'a[href="/todos?status=completed"]', done: `location.search === '?status=completed' && document.querySelectorAll('[role="checkbox"]').length === ${expected.completed}` },
    { name: "completed→all", sel: 'a[href="/todos"]:not(aside a)', done: `location.search === '' && document.querySelectorAll('[role="checkbox"]').length === ${expected.all}` },
  ];
  const acc = Object.fromEntries(steps.map((s) => [s.name, { content: [], feedback: [], reqs: [], rest: [], auth: [], longtask: [], eventMax: [], cls: [] }]));
  for (let cycle = 0; cycle < N + 1; cycle++) {
    for (const step of steps) {
      const r = await timedClick(page, step.sel, step.done);
      await page.waitForTimeout(SETTLE_MS);
      if (cycle === 0) continue;
      const w = await page.evaluate(({ from, to }) => {
        const inW = (e) => e.s >= from && e.s <= to;
        return {
          longtask: window.__perf.longtasks.filter(inW).reduce((a, e) => a + e.d, 0),
          eventMax: Math.max(0, ...window.__perf.events.filter(inW).map((e) => e.d)),
          cls: window.__perf.shifts.filter(inW).reduce((a, e) => a + e.v, 0),
        };
      }, { from: r.t0, to: r.t0 + r.contentMs + 200 });
      const calls = serverCalls(r.epoch0, r.epoch1);
      const a = acc[step.name];
      a.content.push(r.contentMs); a.feedback.push(r.feedbackMs); a.reqs.push(requestsIn(r.epoch0, r.epoch1).count);
      a.rest.push(calls.rest); a.auth.push(calls.auth); a.longtask.push(w.longtask); a.eventMax.push(w.eventMax); a.cls.push(w.cls);
    }
  }
  results.filters = {
    expectedRows: expected,
    ...Object.fromEntries(
      Object.entries(acc).map(([k, a]) => [
        k,
        { contentMs: stats(a.content), firstDomChangeMs: stats(a.feedback), browserRequests: stats(a.reqs), serverRestCalls: stats(a.rest), serverAuthCalls: stats(a.auth), longtaskMs: stats(a.longtask), eventDurationMaxMs: stats(a.eventMax), clsSum: Math.round(a.cls.reduce((x, y) => x + y, 0) * 1000) / 1000 },
      ])
    ),
  };
}

// ---- server: isolated document requests ------------------------------------
if (SCENARIOS.includes("server")) {
  results.server = {};
  const routes = ["/todos", "/todos?status=active", "/fitness", "/fitness?tab=exercises", "/routines", routineHref ?? "/routines", "/goals"];
  for (const route of routes) {
    const ms = [], auth = [], authMs = [], rest = [], restMs = [];
    for (let i = 0; i < N + 1; i++) {
      const t0 = Date.now();
      const res = await context.request.get(`${BASE}${route}`);
      await res.body();
      const t1 = Date.now();
      if (i === 0) continue;
      const calls = serverCalls(t0, t1);
      ms.push(t1 - t0); auth.push(calls.auth); authMs.push(calls.authMs); rest.push(calls.rest); restMs.push(calls.restMs);
    }
    results.server[route] = { totalMs: stats(ms), authCalls: stats(auth), authMs: stats(authMs), restCalls: stats(rest), restMs: stats(restMs) };
  }
}

const meta = {
  label: LABEL,
  date: new Date().toISOString(),
  commit: execSync("git rev-parse --short HEAD").toString().trim(),
  node: process.version,
  platform: `${os.platform()} ${os.release()} ${os.cpus()[0]?.model ?? ""}`.trim(),
  base: BASE,
  iterations: N,
  emulatedRttMs: RTT,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ meta, results }, null, 2));
console.log(JSON.stringify({ meta, results }, null, 2));
await browser.close();
