# Life OS – v2 Build Workflow

Last updated: 2026-09-18

> **Status as of 2026-09-19:** Phase 1 is complete; Phase 2 (Stage 1) is next. Check off a phase only after the deliverable has been reviewed and approved in chat.
>
> The [v2 PRD & ERD Baseline](./v2-prd-erd-baseline.md) is newer than this checklist and wins wherever they differ. Known differences for upcoming phases:
>
> - **Phase 2:** the "last logged ~15 hours ago" fix is **not** in Stage 1 (moved to Stage 3 / Phase 4). The design-system amendment now also covers a **dark palette**, and Stage 1 adds **Sentry** with a new ADR (ADR-008 onward) limiting report contents: no task titles, workout values or financial amounts. The client-side-caching ADR is still only written if measurement demands it.
> - **Phase 5 (Stage 4):** the "item optionality" line is replaced by per-item repeatability relative to the routine's occurrences; there are no manual per-occurrence skips.
> - The backlog has 19 listed items and 18 distinct problems (two describe the missing workout-edit feature).


## Overview

The v2 workflow runs one lightweight lifecycle per stage instead of v1's single pass over the whole app. Phase 1 sets the baseline, Phases 2 to 7 deliver the stages of the [v2 plan](./v2-plan.md), and Phase 8 reviews the result.

Every delivery phase draws from the same eight-step template (A to H). Steps that don't apply are skipped: Stage 1 has no schema work, and the rename has almost no design work.

References: [v2 backlog](./v2-backlog.md) · v1 build workflow

## Working rules

- A phase is complete only after you review its deliverable and approve it in chat. "Review & approve" is the last item in every phase.
- Schema changes go to life-os-dev first, then life-os-prod. Migrations stay in version control.
- Every fixed backlog item gets a regression test (Vitest or Playwright) before deploy.
- Each phase's data-model delta is folded into the canonical ERD when the phase closes.
- ADRs are append-only: new ones start at ADR-008, and a changed decision supersedes the old ADR rather than editing it.
- Goals and Finance ship as separate phases, one domain per release.

## Tools by surface

| Surface | Use in v2 |
| --- | --- |
| **Chat** | PRD, data-model deltas, ADRs, task plans and close-out. With the Supabase connector it can read the live schema and run security advisors. With the Vercel connector it can check deployments and runtime logs. |
| **Design** | Design-system amendment, wireframes and mockups for new or changed screens. Iterate on the canvas instead of routing each tweak through Chat. |
| **Claude Code** | Anything in the repo (gurukartkn/life-os): migrations, code, tests and deploys. |
| **Cowork** | Optional research or tracking outside the repo, such as surveying bank CSV export formats before the Finance import design, or a tracking sheet for the review phase. |

## Step template

Phases 2 to 7 pick from these eight steps. Each phase below lists only the steps that apply to it.

| Step | Deliverable | Tool | Skip when |
| --- | --- | --- | --- |
| A. Data-model delta | New or changed tables, RLS, migration and data-migration notes | Chat with the Supabase connector; `engineering:system-design` | No schema change |
| B. ADR | ADR-008 onward, only for a new decision | Chat; `engineering:architecture` | No new decision |
| C. Design | Design-system amendment, wireframes, mockups | Design; `frontend-design`, `design:design-system` | No new or changed screens |
| D. Task plan | Ordered tasks and the Claude Code prompt for the phase | Chat | Never |
| E. Build | Migration on life-os-dev, then code | Claude Code; `engineering:code-review` after each task | Never |
| F. Test & QA | Regression test per fix, e2e for new flows | Claude Code; `engineering:testing-strategy` | Never |
| G. Deploy | Migration on life-os-prod, Vercel deploy, smoke test | Claude Code; `engineering:deploy-checklist`; Chat with the Vercel and Supabase connectors to verify | Never |
| H. Close-out | ERD updated, backlog items marked, deliverables filed | Chat | Never |

## Phase 1 — v2 PRD & ERD Baseline

**Goal:** Write a short v2 PRD and bring the ERD in line with the live schema before any delta is added.

**Surface: Chat**, using the `product-management:write-spec` skill and the Supabase connector to read life-os-prod.

- [x] Short v2 PRD: goals, non-goals and acceptance criteria per stage, linking to the v1 PRD, v2 plan and v2 backlog
- [x] Acceptance criterion for each of the 18 distinct backlog items
- [x] ERD reconciled with the live schema (table list, RLS on every table)
- [x] Review & approve

## Phase 2 — Stage 1: Quick Wins & Performance

**Goal:** Ship the backlog fixes that need no schema change, and find the cause of the lag before adding any caching.

**Surfaces: Design** for the design-system amendment, then **Claude Code**, with `engineering:debug` for the elapsed-time bug and the lag diagnosis.

- [ ] C. Design-system amendment: input fill and radius, primary button variants, shadcn calendar, collapsible sidebar
- [ ] D. Task plan for the phase
- [ ] E. UI fixes: password show/hide, input styling, "Add todo" button style, calendar, collapsible sidebar
- [ ] E. Export option shown only when there is data
- [ ] E. Fix "last logged ~15 hours ago" after finishing a workout
- [ ] E. Performance: measure page switching; check function region vs Supabase region, sequential queries, per-navigation auth round trip and loading states; make filter tabs filter the loaded list
- [ ] B. ADR, only if measurement shows client-side caching is needed (would supersede parts of ADR-003 and ADR-004)
- [ ] F. Regression test per fix
- [ ] G. Deploy and smoke test
- [ ] H. Close-out
- [ ] Review & approve

## Phase 3 — Stage 2: Rename Todo → Tasks

**Goal:** Merge the Todo and Tasks domains into one Tasks domain through a single isolated migration and code sweep, and allow past dates on tasks.

**Surfaces: Chat** for the delta and plan, **Claude Code** for the sweep.

- [ ] A. Data-model delta: rename `todos` to `tasks` with its RLS policies, and update any `links` rows that reference the old type name
- [ ] D. Task plan: routes, types, Zod schemas, Server Actions, UI copy, tests and export shape
- [ ] E. Reversible migration on life-os-dev, then the code sweep
- [ ] E. Allow past dates on task creation and render them as overdue
- [ ] F. Update the existing Todo tests to Tasks and add a test for past dates
- [ ] G. Migration on life-os-prod, deploy, smoke test
- [ ] H. Close-out: ERD and PRD updated for the merged domain
- [ ] Review & approve

## Phase 4 — Stage 3: Fitness Rework

**Goal:** Add workout editing, Muscle Groups and Equipment submodules, and a friendlier exercise form.

**Surfaces: Chat** for the delta, ADR and plan, **Design** for the form and screens, **Claude Code** for the build.

- [ ] A. Data-model delta: Muscle Groups and Equipment tables with join tables to exercises, migration of existing exercise values, and the rule that workout edits update past logs without losing logged sets
- [ ] B. ADR, only if the delta surfaces a new decision (for example how edits propagate to past logs)
- [ ] C. Wireframes, then mockups: exercise form, Muscle Groups, Equipment, workout edit
- [ ] D. Task plan
- [ ] E. Submodules and exercise form
- [ ] E. Workout editing
- [ ] F. Tests, including editing a workout that already has logs
- [ ] G. Deploy and smoke test
- [ ] H. Close-out
- [ ] Review & approve

## Phase 5 — Stage 4: Routines Rework

**Goal:** Add time of day, flexible frequency, skippable items and a friendlier checklist to Routines.

**Surfaces: Chat** for the delta, ADR and plan, **Design** for the forms, **Claude Code** for the build.

- [ ] A. Data-model delta: time-of-day field, frequency columns (type, times per week, days of week), item optionality, and per-occurrence skips in `routine_completions`
- [ ] B. ADR: recurrence model (simple columns for now)
- [ ] C. Wireframes, then mockups: routine form and checklist interaction
- [ ] D. Task plan
- [ ] E. Time of day and frequency
- [ ] E. Optional and skippable items; new checklist interaction
- [ ] F. Tests, including each frequency type and skipped items
- [ ] G. Deploy and smoke test
- [ ] H. Close-out
- [ ] Review & approve

## Phase 6 — Stage 5a: Goals

**Goal:** Promote Goals from the minimal v1 entity to a full domain linked to tasks, routines and fitness.

**Surfaces: Chat**, **Design** and **Claude Code**, with the full phase flow.

- [ ] Scope: Goals requirements added to the v2 PRD
- [ ] A. Data-model delta: check whether the `links` table can carry goal relationships before adding join tables
- [ ] B. ADR, only if `links` can't carry them
- [ ] C. Wireframes, then mockups
- [ ] D. Task plan
- [ ] E. Build
- [ ] F. Tests
- [ ] G. Deploy and smoke test
- [ ] H. Close-out
- [ ] Review & approve

## Phase 7 — Stage 5b: Finance

**Goal:** Add Finance: accounts, categories, budgets, recurring items and transactions, in ₹ as a single currency, with manual entry and CSV import.

**Surfaces: Chat**, **Design** and **Claude Code**, with **Cowork** optional for CSV format research.

- [ ] Scope: Finance requirements added to the v2 PRD, including CSV column mapping and duplicate handling
- [ ] Optional (Cowork): survey common bank CSV export formats to shape the import
- [ ] A. Data-model delta: accounts (labels only, no account numbers), categories, budgets, recurring items, transactions and RLS
- [ ] B. ADR: money representation (integer paise, with room to add a currency column later)
- [ ] C. Wireframes, then mockups: accounts, transactions, budgets, recurring items, CSV import
- [ ] D. Task plan
- [ ] E. Build: manual entry first, then CSV import
- [ ] F. Tests, including import edge cases and duplicate handling
- [ ] G. Deploy and smoke test
- [ ] H. Close-out
- [ ] Review & approve

## Phase 8 — v2 Post-Launch Review

**Goal:** Check v2 against the v2 PRD's acceptance criteria and decide what comes next.

**Surface: Chat** to interpret, and **Cowork** if you want a tracking sheet rather than checking manually.

- [ ] All 18 backlog items confirmed fixed in daily use
- [ ] Page-switch and filter-tab performance re-checked
- [ ] New friction list compiled, if any
- [ ] Decide what pulls into the next version (remaining domains, or sharing and offline)
- [ ] Review & approve
