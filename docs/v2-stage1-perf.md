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

## Limits of the baseline numbers

- The machine running the harness is about 300 ms from Supabase (us-east-1). On Vercel the function and database are normally in the same region, so each server-side round trip costs far less there and these absolute times overstate the server's part. What carries over is the **count of sequential round trips** (auth 1–2, queries 1–5) and the browser-to-server round trip per navigation. A measurement against a deployed preview would show how much of the felt lag is distance to us-east; it needs a Vercel protection bypass, not yet provided.
- The Vercel function region is not visible through the API (default iad1, unconfirmed).
- Chrome's built-in network emulation adds only a latency floor and did nothing on top of a slow server; RTT runs use `scripts/perf/delay-proxy.mjs`. The first two RTT results recorded that way were discarded.
- Per-navigation attribution of server calls in client-side windows is indicative only (prefetch requests overlap); the isolated-request table is the clean source.

## After (commit `f8539f0`, all Stage 1 changes, Sentry enabled)

Same harness, same seed data, same machine, same 20 iterations. Median ms. Raw results in `docs/perf/final-*.json`.

### Page switching (client navigation)

| Step | Baseline | After | Change |
|---|---|---|---|
| Today → Fitness | 1075 | 406 | −62% |
| Fitness → Routines | 1429 | 406 | −72% |
| Routines → routine detail | 2268 | 402 | −82% |
| Routine detail → Today | 718 | 397 | −45% |

Large data (300 todos, 30 workouts, 10 routines): 1080 / 1467 / 2358 / 775 → 365 / 367 / 357 / 406. With +200 ms added RTT (small data): 1177 / 1568 / 2351 / 795 → 482 / 462 / 483 / 456.

Cold document loads, small data (load event): Today 698 → 405, Fitness 1031 → 406, Routines 1433 → 405, routine detail 2068 → 404. First contentful paint: 696 / 684 / 692 / 732 → 404 / 408 / 400 / 420.

Server, isolated document requests (auth calls, queries in sequence): `/todos` 754 (2, 1) → 360 (0, 1 batch); `/fitness` 1114 → 383; `/routines` 1411 → 385; `/routines/[id]` 2044 → 394; `/goals` 750 → 361. (The "REST calls" column in the raw output now counts the Export-data probe, which runs in parallel with the page's own queries and adds no wall-clock time here.)

### Todo filter tabs

| Step | Baseline (12 todos) | After (12) | Baseline (300) | After (300) |
|---|---|---|---|---|
| All → Active | 712 | 2 | 763 | 24 |
| Active → Completed | 722 | 2 | 772 | 26 |
| Completed → All | 716 | 3 | 825 | 50 |

Zero server requests per click (was one full server render). With +200 ms RTT the baseline was 818 / 813 / 866; after it is 2 / 2 / 3.

### What each fix contributed (intermediate runs, small data, +0 ms RTT)

| Step | Baseline | after filter fix | + local session check | + parallel queries |
|---|---|---|---|---|
| Today → Fitness | 1075 | 1033 | 719 | 360 |
| Fitness → Routines | 1429 | 1427 | 1057 | 401 |
| Routines → routine detail | 2268 | 2318 | 2036 | 378 |
| Routine detail → Today | 718 | 708 | 356 | 346 |
| Filter tab (All → Active) | 712 | 2 | 2 | 2 |

The local session check removes one Supabase Auth round trip from every navigation (about 350 ms here). Running independent queries together turns 2, 3 and 5 sequential round trips into one. The filter change removes the whole server round trip.

### Fixes considered and not made

- **Instant click feedback on sidebar links.** Measured: the first visible change after a click (the route's skeleton) already happens within 3 ms, so there is nothing to add. Not done.
- **Client-side caching / longer router cache.** Not needed: after the fixes each navigation is one batch of parallel queries, and the remaining time is that round trip. No ADR-009 was written.
- **Function region.** Both Supabase projects are us-east-1; the Vercel function region could not be read through the API. See below.

### Layout-shift metric (not meaningful)

The harness reports CLS of 1.9 (small) and 8.3 (large) when going Completed → All, both before and after. A probe showed these are the previous list's rows being removed from the page, counted as movement because the harness clicks programmatically (a real click would exempt them). It is not real jitter, so it is not used as a result.

## Limits of these numbers

- **This machine is about 300 ms from Supabase**, whereas a Vercel function in the same region as the database is a few ms. Absolute times therefore overstate the database's share. Two things carry over to production regardless: the number of sequential round trips fell from 1 auth call (2 on a full page load) plus up to 5 queries to a single parallel batch, and a filter tab click no longer needs any network at all.
- What this does not show is how much of the felt lag on Vercel is the distance between you and the server (browser to a US-east function), which no code change here affects. Measuring that needs a Vercel preview with a protection bypass (not provided), or a timing from your own browser against the deployed app; it should now be roughly one browser round trip plus a few ms per navigation.
- RTT runs use `scripts/perf/delay-proxy.mjs`; Chrome's own emulation only sets a latency floor and did nothing on top of a slow server. The RTT effect visible in these runs is smaller than the nominal 200 ms, both before and after; the reason was not established, so treat those rows as directional.
- The Vercel function region is unconfirmed (default iad1).

## How to re-run

```
npm run build && npm run start          # with PERF_LOG and NODE_OPTIONS as in scripts/perf/measure.mjs
node scripts/perf/seed.mjs small        # or large; `clear` removes the data again
node scripts/perf/measure.mjs --label=<name> --n=20
node scripts/perf/summarize.mjs perf-out/<name>.json
```