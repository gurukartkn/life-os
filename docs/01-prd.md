# PRD: Life OS (working title)

Source: https://claude.ai/artifact/L8zzbMmhWm5EZazS3quAn4

## 1. Executive Summary & Problem Statement

- **One-Liner:** A single interlinked personal operating system where Todos, Fitness, and Routines reference each other natively — built on a data backbone designed to absorb every other life domain (Finance included) later without a rebuild.
- **The Core Problem:** Every tool tried so far fails in one of two opposite directions. Obsidian's unlimited customization turned into a second full-time project — plugins, templates, and vault architecture consumed more time than actually logging anything, and the vault was eventually abandoned. Notion's rigid page/database model doesn't match how data actually needs to be captured or viewed — input friction and display mismatch made it something to fight rather than use. No existing tool treats Todo, Fitness, Finance, and Routines (and eventually Projects, Goals, Health, Trips, etc.) as one relational graph — they're siloed trackers bolted together in a dashboard, not a system where a workout can point at a goal and an expense can point at a trip.
- **Target User:** A single power user (also the builder) who wants a daily operating tool, not a wiki or a knowledge base. Optimizes for near-zero capture friction and for the system requiring no ongoing "maintenance" to stay usable.
- **Success Metrics:**
  - **Daily-open rate:** app is opened unprompted ≥5 of 7 days within the first 30 days of MVP use (the bar Obsidian and Notion both failed).
  - **Capture latency:** creating a Todo, logging a workout, or logging an expense takes <10 seconds from "open app" to "saved," with zero required setup step before first use.
  - **Zero configuration tax:** time spent in settings/schema/customization screens stays near zero relative to time spent logging and reviewing data — if this ratio starts climbing, that's the Obsidian failure mode recurring and is a stop-and-reassess signal, not a feature to build around.
  - **Zero data loss:** no state is ever lost on reload, tab close, or network drop (see FR-08).
  - **Cross-domain linking actually used:** by week 4, at least 50% of new Fitness entries (workout sessions) have a link to another entity (a Goal, a Routine) — evidence the graph is doing real work, not sitting unused as an admin feature.

## 2. Scope & Boundaries

**Resolution of a real tension:** ~75% of the 19 domains would be used daily, but only 4 were picked for MVP. Both are true and not contradictory — the risk isn't *wanting* 19 domains, it's *building* 19 domains before validating the core loop, which is exactly the Obsidian trap wearing a different hat (endless scaffolding, no usage). The resolution: the **data model** is built once to support all 19 domains as first-class citizens; the **UI** ships for 4. Adding domain #5 later should mean writing a new table + a new screen, not re-architecting the app.

**In-Scope (v1 MVP):**
- Todo (tasks, due dates, status, project/area linking)
- Fitness (exercise catalog, workout templates, logged sessions with per-set weight/reps/time, linkable to Goals)
- Routines (recurring checklists with daily/weekly reset)
- The **Universal Link Engine** — a generic cross-entity linking layer all four domains write to, and all future domains will plug into
- Single-user auth (magic link via Supabase Auth) — required even for a single-player app because the data lives in a shared Postgres instance and needs Row Level Security to isolate it
- Global Quick Capture (one shortcut/button to add a Todo, expense, or workout from anywhere in the app without navigating)
- Basic full-text search across all logged entities
- A "Today" dashboard as the default landing view

**Explicitly Out-of-Scope (v1):**
- The other 16 domains (Finance, Projects, Notes, Goals, Life Areas, Hobbies, Skills, Health, Mindfulness, Books, Movies, Series, Diet, Recipes, Trips, Inventory) — **deferred, not rejected.** Each is added post-MVP as a new entity type on the existing backbone, prioritized by which the 3 shipped domains create the most natural pull toward (e.g., Fitness will likely pull in Goals and Health first).
- Finance specifically — originally scoped for v1 as expense-only tracking, now moved out of the MVP build entirely to keep the first release to three domains. When it's picked back up, the `type` (`expense`|`income`) and general `account`/`category` shape from the original design (see Section 7) still applies, so it can extend additively rather than needing a rebuild.
- Multi-device sync conflict handling beyond "last write wins" — irrelevant until multi-user or offline exists.
- Multi-user / sharing / collaboration (single-player for phase one).
- Offline mode / PWA / local-first caching (web-only is acceptable for now; revisit once the core loop is proven).
- Native mobile app (mobile-responsive web only).
- Notifications, reminders, and push alerts.
- AI features (auto-categorization, natural-language capture, insights) — genuinely useful later, but not needed to validate the core loop and easy to bolt onto a clean schema afterward.
- Data import from Notion/Obsidian/other tools — leaving those tools behind, not migrating a vault; import can be revisited later if the historical data is wanted.

## 3. User Journeys & Critical Paths

**Journey 1: Daily operating loop (Primary Happy Path)**
- *Trigger:* User opens the app in the morning.
- *Step-by-step flow:*
  1. Lands on the **Today** dashboard: today's Routine checklist, Todos due today, and a running weekly Finance snapshot.
  2. Checks off Routine items one by one; each check is optimistic (updates instantly, syncs in background).
  3. Adds a new Todo via Quick Capture mid-day without leaving whatever screen they're on.
  4. Logs a workout session in Fitness — picks a saved template (or logs ad hoc), records each set's weight/reps or time, and links the session to an existing Goal entity (e.g., "Run a sub-25-min 5K") via the Link Engine's inline picker.
  5. Returns to Today dashboard at day's end; sees Routine completion % and Todos closed.
- *Expected Outcome:* Every domain touched in under 10 seconds each, no navigation dead-ends, and at least one cross-domain link created without it feeling like a separate "linking" chore.

**Journey 2: Network drop mid-edit (Error Recovery)**
- *Trigger:* User is editing/creating an entry (e.g., typing a Finance transaction) and the network drops.
- *Step-by-step flow:*
  1. UI has already applied the change optimistically (row appears instantly).
  2. A subtle "not yet saved" indicator appears on that specific row the moment the write fails.
  3. App retries the write automatically in the background when connectivity returns; indicator clears on success.
  4. If the user closes the tab before reconnection, the unsaved change is **not** silently lost — the local queue is checked on next load and the user is prompted to retry or discard.
- *Expected Outcome:* The user never has to wonder "did that save?" — the zero-data-loss success metric holds even without full offline support.

## 4. Functional Requirements

| ID | Feature | Description | Priority | Acceptance Criteria |
|---|---|---|---|---|
| **FR-01** | Auth / Session | Magic-link login via Supabase Auth; session persists across reloads. | P0 | Given a valid magic-link token, when the user clicks it, then they land on the Today dashboard in <1s with a persisted session (no re-login on refresh). |
| **FR-02** | Universal Link Engine | A generic `links` table (`source_type`, `source_id`, `target_type`, `target_id`, `relationship_label`) that any domain entity can write to and query, independent of domain-specific schema. | P0 | Given a Fitness log and a Goal both exist, when the user links them, then both entities show the link bidirectionally, and the link survives a page reload. |
| **FR-03** | Todo CRUD | Create, edit, complete, delete, and due-date a task; optional link to Project/Goal/Routine. | P0 | State (including completion) persists across app reloads with no re-fetch flash of stale data. |
| **FR-04** | Fitness Log | Maintain an exercise catalog (muscle groups, type, equipment) and named workout templates built from it; log a session against a template (or ad hoc) with per-set weight/reps or duration, optional link to a Goal. | P0 | Given a logged workout session, when the user opens the linked Goal, then the session appears in that Goal's activity feed. |
| **FR-05** | Finance Log *(deferred)* | **Deferred to v2 — not built as part of the MVP.** Originally: log an expense transaction (amount, category, date, optional link to Project/Trip); simple running total by category and by week, with a `type` column (`expense` \| `income`) from the start so income and a computed balance are additive later, not a migration. | Deferred | N/A for v1. |
| **FR-06** | Routines Engine | Define a recurring checklist (daily/weekly); auto-resets completion state on the defined cadence. | P0 | Given a daily Routine, when the date rolls over past midnight local time, then all items reset to unchecked and the previous day's completion % is preserved in history. |
| **FR-07** | Global Quick Capture | A persistent, keyboard-accessible entry point to create a Todo or Fitness log entry from any screen. | P0 | Given the user is on any screen, when they trigger Quick Capture, then they can create and save a new entry in ≤3 interactions without a full page navigation. |
| **FR-08** | Optimistic Writes + Retry Queue | All writes apply to the UI instantly; failed writes are queued and retried, with a visible per-item "unsaved" state. | P0 | Given a write fails (network drop), when connectivity returns, then the queued write completes automatically and the "unsaved" indicator clears without user action. |
| **FR-09** | Search & Filter | Full-text search across Todos, Fitness logs, and Routines; debounced query. | P1 | Given a search term, when the user types, then results update within 150ms of the debounce window closing, across all four domains. |
| **FR-10** | Today Dashboard | Aggregated view: today's Routine checklist and Todos due today. | P0 | Given data exists across the three domains, when the user loads the app, then the Today dashboard renders both summaries in a single view with no per-domain navigation required. |
| **FR-11** | Data Export | One-click export of all user data as a single JSON file. | P1 | Given the user requests an export, when it completes, then a downloadable JSON file contains every entity and every link with no data loss — this is the explicit anti-lock-in guarantee after the Obsidian/Notion experience. |
| **FR-12** | Minimal Goal Entity | A lightweight linkable entity (title, optional target date, optional status) — not a full Goals module, just enough for Fitness (and later other domains) to link against. | P0 | Given a Goal exists, when the user views its detail page, then it shows every entity linked to it (e.g., all Fitness logs) via the Link Engine (FR-02), with no Goal-specific dashboard or tracking logic beyond that. |

## 5. Screen Inventory (for Claude Design)

**Screen 1: Today (Dashboard / Home)**
- Key UI components: Routine checklist widget, "Due Today" Todo list, Quick Capture button (persistent, floating or header-anchored), global search bar.
- States required: Empty state (new user, no data yet — shows a single clear "add your first Routine" prompt, not three), loading skeleton per widget (independent, so one slow domain doesn't block the others), populated, network error banner (non-blocking, dismissible, paired with the FR-08 retry indicator).

**Screen 2: Domain List View (Todo / Fitness / Routines — shared layout pattern)**
- Key UI components: filter bar (status, date range, linked-entity filter), list/table of entries, inline quick-add row at the top, per-row link indicator (shows count of linked entities, expandable).
- States required: empty, loading skeleton, populated, filtered-empty ("no results for this filter" distinct from true empty state).

**Screen 3: Entity Detail / Editor View (generic, shared across domains)**
- Key UI components: domain-specific field editor (Todo fields vs. Fitness fields vs. Finance fields), Link Engine picker (search-and-attach any other entity), activity/link feed showing everything this entity is connected to, delete/archive action.
- States required: create mode (blank), edit mode (pre-filled), save-in-progress (optimistic, non-blocking), link-picker open (search overlay).

**Screen 4: Quick Capture (modal/overlay, not a full screen)**
- Key UI components: domain selector (Todo / Fitness), minimal field set per domain (only what's required to save), save-and-close vs. save-and-add-another.
- States required: default (domain unselected), domain selected (fields shown), save success (auto-dismiss), save error (inline, non-blocking — see FR-08).

## 6. Non-Functional Requirements

- **Performance:** First Contentful Paint (FCP) < 1.2s on the Today dashboard; all writes (Todo complete, Routine check, quick-add) are optimistic — UI updates before the network round-trip completes.
- **Security & Privacy:** Supabase Row Level Security (RLS) scoped to the authenticated user on every table from day one, even though it's single-player — the data lives in a shared Postgres instance, not local storage, so this is the actual security boundary. Financial and fitness data are not sent to any third-party analytics tool. Secrets (Supabase service role key, etc.) live server-side only, never in client bundles.
- **Reliability:** No offline mode in v1 (confirmed out of scope), but graceful degradation on connection loss per FR-08 — the app never silently loses a write, and never blocks the UI while waiting on a network call.
- **Portability / Anti-Lock-In:** Given the stated history with Obsidian and Notion, full data export (FR-11) is treated as a P1, not a someday-maybe — the user should never feel trapped in this tool the way they felt trapped configuring the last two.

## 7. Risks, Dependencies & Open Questions

- **Dependency:** Supabase free-tier project limits (database size, concurrent connections) and Vercel free-tier limits (function execution time, bandwidth) — both are generous for a single-user app and unlikely to bind in v1, but worth a one-line note if the app ever moves to multi-user.
- **Technical Risk — schema over-engineering:** The temptation to build a fully generic "everything is an entity" schema (so all 19 domains are just rows in one giant polymorphic table) is real and is, architecturally, the same trap as Obsidian's infinite customization. **Recommended resolution:** each domain gets its own strongly-typed table (`todos`, `workouts`, `transactions`, `routines`) for good query performance and clean Zod validation, plus one shared generic `links` table (FR-02) purely for cross-domain relationships. This is a deliberate middle ground — structured enough to move fast per-domain, flexible enough to interlink everything.
- **Technical Risk — Routine reset timing:** "Reset at midnight" needs a defined timezone (the user's local time, stored per-user) and a mechanism to actually trigger it (a Vercel Cron job hitting a reset endpoint, or a lazy check-on-load that resets a Routine the first time it's viewed after its cadence boundary has passed). Lazy check-on-load is simpler and needs no cron infra — recommended for v1.
- **Note — Finance, whenever it's picked up:** Finance was originally scoped for v1 as expense-only and is now deferred out of the MVP entirely. When it's built, the original design intent still applies: a `transactions` table with a `type` column (`expense` | `income`) and a general `account`/`category` field, so assets and debts can later be added as their own row types rather than needing a breaking migration on a flat expense-only shape.

**Confirmed decisions (previously open questions):**
- Finance is deferred out of the MVP entirely, not built alongside Todo/Fitness/Routines; expense/income/balance/assets/debts/credit tracking all move to a later version, with the schema extension path above kept for when that happens.
- A minimal Goal entity ships in v1 (FR-12) — title, optional target date, optional status, nothing more.
- Data export (FR-11) is JSON only for v1; CSV can be revisited later if a specific need for it comes up.

## 8. Proposed Tech Stack

Stack — Next.js, Supabase, Vercel, Shadcn, Zod, Zustand — is a solid, coherent modern stack and needs only small additions, not changes:

- **Framework / Hosting:** Next.js (App Router) on Vercel — good fit, first-class integration, generous free tier for a single-user app.
- **Database / Auth:** Supabase (Postgres + Auth + RLS) — matches the "relational, not document-store" requirement directly; magic-link auth via Supabase Auth covers FR-01 with no custom auth code.
- **UI Components:** Shadcn/ui — good fit, unstyled-by-default components keep the app from looking like a generic template.
- **Validation:** Zod — good fit, pairs directly with Supabase's generated TypeScript types and with form validation.
- **Client State:** Zustand — good fit for **UI state** (Quick Capture modal open/closed, active filters, active domain tab). *(Note: superseded by ADR-003 — Zustand is UI-state only, no TanStack Query was adopted; see Architecture Decision Records doc.)*
- **Forms:** React Hook Form + `@hookform/resolvers/zod` — standard pairing with Zod, avoids hand-rolled form state.
- **Dates:** `date-fns` — needed for Routine reset-boundary logic (FR-06) and any relative-date display ("due today," "3 days overdue").
- **Type Safety:** Use Supabase's CLI type generator (`supabase gen types typescript`) against the schema rather than introducing a separate ORM (e.g., Drizzle/Prisma) — one source of truth for types, less tooling to maintain.
- **Scheduled Jobs (only if the lazy check-on-load approach for Routines proves insufficient):** Vercel Cron — deferred, not needed for v1 per the Routine reset recommendation above.

> **Note:** Auth landed as email/password for v1 (not magic link) per the Backend Architecture doc — see that doc for the final call.
