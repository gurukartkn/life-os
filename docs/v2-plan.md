# Life OS – v2 Plan

Last updated: 2026-09-18

> **Read this first.** This is the original v2 plan. The [v2 PRD & ERD Baseline](./v2-prd-erd-baseline.md) was written after it and is the source of truth wherever the two differ. Known differences:
>
> - Backlog item 12 (the "last logged ~15 hours ago" bug) is **not** Stage 1. It needs a stored timestamp on workout logs, so it moved to Stage 3.
> - Stage 1 also includes a **dark theme** (choice stored in the browser, no schema change) and **Sentry** error tracking (recorded in a new ADR that limits what reports may contain). Neither appears in the Stage 1 section below.
> - Stage 4: the "mark items as required or optional" idea below is replaced by **per-item repeatability** relative to the routine's occurrences (see the PRD's confirmed decisions and Stage 4 criteria).
> - Backlog numbering in the PRD and [v2 backlog](./v2-backlog.md) runs 1–19; this plan refers to items by description, not number.
>
> The Stage 1 performance checklist below (function region vs Supabase region, sequential queries, auth round trip, loading states, filter tabs refetching) is still the intended starting point for the performance investigation.


## Overview

v2 runs on two tracks: clear the 18 distinct issues from v1 testing first, then add new domains (Goals, then Finance) on the cleaner base. The [v2 backlog](./v2-backlog.md) lists 19 items, but two describe the same problem (workouts can't be edited).

Stages are ordered so that sweeping changes land before more code depends on them, and data-model changes land before Goals starts linking everything together.

| Stage | Focus | Schema change | Design work |
| --- | --- | --- | --- |
| 1 | Quick wins and performance | No | Design-system amendment |
| 2 | Rename todo → tasks | Yes (rename) | None |
| 3 | Fitness rework | Yes | Wireframe + mockup for forms |
| 4 | Routines rework | Yes | Wireframe + mockup |
| 5 | Goals, then Finance | Yes | Full phase flow per domain |

## Stage 1: Quick wins and performance

Stage 1 ships as a small release with no schema changes. Each fix gets a Vitest or Playwright regression test, and changes go dev → prod as before.

**UI consistency**

- Show/hide password icon on login and sign-up
- Input boxes: fix the grey fill and over-rounded corners to match other components
- "Add todo" button styled like "new workout" and "new routine"
- shadcn calendar for date pickers
- Collapsible sidebar

Do these as a design-system amendment (input fill and radius, button variants) so each is fixed once, not per screen.

**Data export**

Show the export option only when the user has data to export.

**Bug: "last logged ~15 hours ago"**

After finishing a workout, the app shows a stale elapsed time. Hypothesis: performed-on is stored as a date, so elapsed time counts from midnight. Verify, then show "today" for same-day logs or store a timestamp.

**Performance**

Page switching lags, and the todo filter tabs (All/Completed/Active) feel jerky. Measure before adding client-side caching. Check these first:

- Vercel function region vs Supabase region
- Sequential queries that could run in parallel
- An auth round trip on every navigation
- Missing loading states
- Filter tabs refetching from the server instead of filtering the list already on the page

Client-side caching is the last resort: it cuts against ADR-003 and ADR-004, so it would need a new ADR.

## Stage 2: Rename todo → tasks

The Todo and Tasks domains merge into a single Tasks domain (decided). The rename ships as one isolated migration and code sweep, before Fitness and Routines work adds more references to the old name.

Scope of the sweep:

- The `todos` table and its RLS policies
- Any `links` rows that reference the entity by type name
- Routes, types, Zod schemas and Server Actions
- UI copy, tests and the data-export shape

Run the migration on life-os-dev first, verify, then apply to life-os-prod. Keep it reversible until prod is confirmed.

Decided: allow past dates when creating a task, and render them as overdue. This rides along with the rename.

## Stage 3: Fitness rework

Workout editing, the Muscle Groups and Equipment submodules, and the exercise form are one unit, because the form depends on the new submodules.

- **Muscle Groups and Equipment** become their own tables, structured like Exercise, with join tables to exercises. Existing exercise values need a migration. This assumes they are plain columns on exercises today; confirm against the schema.
- **Exercise form:** redesign for friendliness. Pick from existing muscle groups and equipment, or create one inline.
- **Workout editing:** edit the name, add, remove and reorder exercises. The backlog lists this twice, once as "can't edit" and once as "inconsistent with exercises".

Decided: workout edits update past logs. The data-model delta must make sure logged sets are never lost, for example when an exercise is removed from a workout.

Deliverables: data-model delta, then wireframe and mockup for the exercise form and workout edit.

## Stage 4: Routines rework

Routines is the largest stage: four backlog items change how a routine is defined and how completions are recorded.

- **Time of day** field on routines
- **Frequency:** daily, N times a week, or specific days of the week
- **Skippable or varying items per occurrence**, e.g. a face scrub isn't needed every day in a morning skincare routine
- **Checklist interaction:** replace the "view checklist" flow with something friendlier for checking items off

Frequency and per-occurrence skips both change what `routine_completions` records, so model them together. Design points for this stage:

- Frequency storage: simple columns (type, times per week, days of week) for now (decided). Revisit a recurrence rule format if needs grow.
- Item optionality: mark items as required or optional on the routine, and record skips per occurrence.

Deliverables: data-model delta, an ADR for the recurrence model, wireframe and mockup, then build.

## Stage 5: Goals, then Finance

Goals comes first because Tasks, Routines and Fitness all link to it, so it should follow their rework. Add one domain per release, using the full phase flow each time: data model, wireframe, mockup, build, test, deploy.

**Goals**

Promote the minimal v1 entity to a full domain. Start by checking whether the existing `links` table can carry goal-to-task, goal-to-routine and goal-to-fitness relationships before adding join tables. Scope gets defined in its own data-model and PRD pass.

**Finance**

Finance was removed from the v1 schema entirely, so it starts from a fresh data-model pass. Decided scope:

- Scope: transactions, accounts, categories, budgets and recurring items
- Entry: manual entry and CSV import
- Currency: single, Indian rupee (₹), for now
- Store account labels, never real account numbers

ADR candidate: money representation (integer paise, with room to add a currency column later). CSV import details (column mapping, duplicate handling) get settled in the Finance data-model pass.

## Documentation approach (proposed)

Reuse the ERD and ADRs, write a short new PRD, and add deltas rather than rewriting the v1 documents.

| Document | v2 approach | Why |
| --- | --- | --- |
| PRD | New, short v2 PRD: goals, non-goals, acceptance criteria per stage. Keep the v1 PRD as the record of the original vision and MVP. | Scope and non-goals changed; the vision and domain list still hold, so link to them instead of copying. |
| ERD / data model | Reuse. One canonical ERD, updated as each stage ships. Each stage writes a short data-model delta first and folds it into the ERD when done. | One database means one source of truth. Migrations in version control already record history. |
| ADRs | Reuse ADR-001 to ADR-007 unchanged. Add ADR-008 onward only for new decisions, and supersede rather than edit. | ADRs are an append-only record of why decisions were made. |
| Design system | Amend in Stage 1 (inputs, buttons, calendar). | The approved system has gaps the backlog exposed. |
| Wireframes and mockups | New screens only: exercise form, workout edit, Routines, Goals, Finance. | Existing screens are covered by the v1 set. |

Expected new ADRs:

- Routine recurrence model (Stage 4)
- Client-side caching, only if Stage 1 measurement demands it (would supersede parts of ADR-003 and ADR-004)
- Money representation (Stage 5)

## Decisions

Five planning decisions are settled; one implementation detail is left for Stage 5.

- [x] Todo and Tasks merge into one Tasks domain
- [x] Past dates allowed on tasks, shown as overdue (Stage 2)
- [x] Workout edits update past logs (Stage 3)
- [x] Routine frequency stored as simple columns for now (Stage 4)
- [x] Finance: ₹ single currency; accounts, categories, budgets and recurring items; manual entry plus CSV import; account labels only (Stage 5)
- [ ] CSV import details: column mapping and duplicate handling (Stage 5)
