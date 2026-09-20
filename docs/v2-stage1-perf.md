# Life OS v2 — Stage 1 performance record

Backlog #6 (page switching lags) and #7 (todo filter tabs feel jerky). PRD Stage 1: measure before any fix, record the cause of each delay, and show each timing improves on its baseline. No fixed targets.

Harness: `scripts/perf/` (Playwright + a fetch logger preloaded into `next start`; nothing in the app is instrumented). Raw results: `docs/perf/*.json`. Method notes are at the end.

## Baseline (commit `ab37ac1`, v1 code, before any Stage 1 change)

Production build (`next build && next start`) on Windows, Node 23, against **life-os-dev**. Median ms, 20 iterations (first discarded). "content" = click → destination heading visible.

### Page switching (client navigation)

| Step | Small data (12 todos, 3 workouts, 2 routines) | Large data (300 / 30 / 10) | Server-side, per navigation |
|---|---|---|---|
| Today → Fitness | 1075 | 1080 | 1 auth call + 2 sequential queries |
| Fitness → Routines | 1429 | 1467 | 1 auth call + 3 sequential queries |
| Routines → routine detail | 2268 | 2358 | 1 auth call + 5 sequential queries |
| Routine detail → Today | 718 | 775 | 1 auth call + 1 query |

With +200 ms added RTT between browser and server (small data): 1177 / 1568 / 2351 / 795. Cold document loads (small data, TTFB → load): Today 677 → 698, Fitness 670 → 1031, Routines 680 → 1433, routine detail 713 → 2068.

### Todo filter tabs

| Step | Small (rtt 0) | Large (rtt 0) | Small (+200 ms RTT) |
|---|---|---|---|
| All → Active | 712 | 763 | 818 |
| Active → Completed | 722 | 772 | 813 |
| Completed → All | 716 | 825 | 866 |

First visible change after a click equals the full time (no feedback until the server answers). Layout shift on Completed → All: 1.92 (small), 8.39 (large). Long tasks and event handler time: 0 ms.

### Server, isolated document requests (no browser, no prefetch)

| Route | Total ms | Auth calls / ms | Queries / ms |
|---|---|---|---|
| /todos | 754 | 2 / 699 | 1 / 318 |
| /fitness | 1114 | 2 / 702 | 2 / 712 |
| /routines | 1411 | 2 / 707 | 3 / 1019 |
| /routines/[id] | 2044 | 2 / 700 | 5 / 1724 |
| /goals | 750 | 2 / 733 | 1 / 315 |

### Noise

Three separate runs of the same scenario (small data): Today → Fitness 1075 / 1164 / 1112; Routines → detail 2268 / 2379 / 2361; filter tabs 712–749. Run-to-run spread is about 8%, so a change only counts as an improvement if the median moves by more than about 10%.

### Raw network from this machine

`auth.getUser()` 307 ms, `auth.getClaims()` 1 ms (local JWT verification, both Supabase projects use ES256 signing keys), a single table query 307 ms, six queries in parallel 370 ms.

## Causes recorded (from the measurements)

1. **Every page switch waits for a network auth check.** `proxy.ts` calls `supabase.auth.getUser()` on every request, a round trip to Supabase Auth before anything renders: about 350 ms of every navigation, serial, before the page's queries can start. `app/(app)/layout.tsx` calls it a second time on full loads (visible in the isolated table: 2 auth calls, about 700 ms).
2. **Pages issue their queries one after another.** Routines list runs 3 queries in sequence (1019 ms), routine detail 5 (1724 ms), Fitness 2 (712 ms). Most are independent. Cost tracks the number of sequential round trips (about 1 per query), not the amount of data: 300 todos vs 12 gives the same timing.
3. **Filter tabs are full server navigations.** Each click makes a server render (auth check plus the todos query) to re-filter a list the page already holds, and shows nothing until it returns. That is the lag; the layout shift is the list swapping in.
4. **Not the cause:** data volume, client rendering (0 ms long tasks), loading states (the skeleton appears within 3 ms of a click; content is what is slow).

## Limits of these numbers

- The machine running the harness is about 300 ms from Supabase (us-east-1). On Vercel the function and database are normally in the same region, so each server-side round trip costs far less there and these absolute times overstate the server's part. What carries over is the **count of sequential round trips** (auth 1–2, queries 1–5) and the browser-to-server round trip per navigation. A measurement against a deployed preview would show how much of the felt lag is distance to us-east; it needs a Vercel protection bypass, not yet provided.
- The Vercel function region is not visible through the API (default iad1, unconfirmed).
- Chrome's built-in network emulation adds only a latency floor and did nothing on top of a slow server; RTT runs use `scripts/perf/delay-proxy.mjs`. The first two RTT results recorded that way were discarded.
- Per-navigation attribution of server calls in client-side windows is indicative only (prefetch requests overlap); the isolated-request table is the clean source.

## After

_Filled in as fixes land._
