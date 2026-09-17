# Life OS — Architecture Decision Records

Source: https://claude.ai/artifact/Q2wwsznZJLMNEqnnJzyauu

**Project:** Life OS (personal life-tracking app)
**Phase:** 2 — Architecture Decision Records
**Stack confirmed in Phase 0:** Next.js, Supabase, Vercel, Shadcn, Zod, Zustand
**Scope confirmed in Phase 1:** Todo, Fitness, Routines domains; single-player v1; web-only; JSON export

---

## ADR-001: Data Access & API Layer Pattern

**Status:** Approved · **Date:** 2026-09-16

**Decision:** Use **Server Actions** as the default data-mutation layer, called directly from Server Components and client forms. Reserve API Routes only for cases Server Actions can't handle (webhooks, non-Next.js consumers, streaming responses).

**Why:** This is a single-consumer app (own Next.js frontend) with no plan for a public API or third-party clients in v1. That collapses the case for tRPC or REST-style API routes. Server Actions minimize boilerplate and pair cleanly with Zod (ADR-005) and Server Components (ADR-004).

**Consequences:** Easier — adding new mutations, keeping client/server types in sync, form handling. Harder — exposing this logic as a public/external API later (would need a thin API Route wrapper). Revisit if a companion mobile app is ever built — extract core logic into plain functions callable from both Server Actions and API Routes.

**Action items:**
- [ ] Establish a `lib/actions/` convention, one file per domain (todos, fitness, routines)
- [ ] Define a shared `ActionResult<T>` return type for consistent success/error handling in the UI

---

## ADR-002: Authentication & Authorization Strategy

**Status:** Approved · **Date:** 2026-09-16

**Decision:** Use **Supabase Auth with email/password (or magic link) sign-in**, a single default user, and **Row Level Security enforced on every table** from day one — even though only one account will exist in practice.

**Why:** The app will be deployed to Vercel (a public URL) rather than run purely locally, so "single-player" describes the *product experience*, not the *deployment security model*. Skipping auth would mean an unauthenticated, publicly reachable database-backed app. Supabase Auth + RLS costs very little extra effort now and avoids a full data-layer rework if a second user is ever added.

**Consequences:** Easier — security is enforced at the database layer, not just the app layer; multi-user is a config change, not a migration. Harder — need a minimal sign-in flow even though only one person will ever log in.

**Action items:**
- [ ] Enable Supabase Auth (email/password or magic link)
- [ ] Confirm RLS policies from the Phase 1 schema are applied to every table (not just `user_settings`)
- [ ] Add a minimal login/callback route in Next.js

> Note: final call per the Backend Architecture doc is **email/password only for v1** — magic link deferred.

---

## ADR-003: State Management Split (Zustand vs. Server State)

**Status:** Approved · **Date:** 2026-09-16

**Decision:** **Zustand owns client-only UI state exclusively.** Server data is fetched via Server Components and Server Actions (ADR-001, ADR-004) and never duplicated into a Zustand store; where client-side reactivity is needed after a mutation, rely on Next.js's built-in `revalidatePath`/`router.refresh()` rather than a separate client cache.

**Why:** Introducing a client-side cache (React Query) would duplicate the Server Components + revalidation mechanism without a clear payoff at this scale (ADR-004). Zustand's role narrows to what it's actually good at: ephemeral UI state that shouldn't trigger a server round-trip (e.g., "which workout exercise row is expanded," "is the add-todo modal open," "which routine tab is active").

**Consequences:** Easier — no risk of server/client state drifting out of sync; simpler stores. Harder — optimistic UI takes a bit more manual work than a library like React Query gives for free. Revisit — if a specific screen needs snappy optimistic updates (e.g., checking off a todo), add `useOptimistic` (React 19) for that one case rather than reaching for a global client cache.

**Action items:**
- [ ] Define Zustand stores per UI concern (e.g., `useUIStore` for modals/tabs), not per domain
- [ ] Document the rule "if it's persisted in Supabase, it doesn't live in Zustand" in the repo README

---

## ADR-004: Data Fetching & Caching Strategy

**Status:** Approved · **Date:** 2026-09-16

**Decision:** **Server Components fetch data by default**, using the Supabase server client. Client Components are used only for interactive pieces (forms, toggles, drag-and-drop) and receive server-fetched data as props rather than fetching independently. After mutations, use `revalidatePath` (or `revalidateTag`) from Server Actions to refresh server-rendered data — no client-side polling or real-time subscriptions for v1.

**Why:** Request/refresh is acceptable for v1 (no live-updating dashboards needed), which makes Server Components the clear fit: simpler, less client JS, no extra caching library. Reinforces ADR-003.

**Consequences:** Easier — fewer moving parts, less client JS, fresh data by default. Harder — no automatic background refetch or live updates; manual refresh/navigation needed to see changes made elsewhere. Revisit if a specific domain later needs live updates — Supabase Realtime can be added scoped to just that feature.

**Action items:**
- [ ] Set up a Supabase server client helper for Server Components
- [ ] Establish `revalidatePath` calls in each Server Action as the standard "refresh after mutation" pattern

---

## ADR-005: Form Handling & Validation

**Status:** Approved · **Date:** 2026-09-16

**Decision:** Use **Zod schemas as the single source of truth for validation**, shared between client and server, with **React Hook Form** for client-side form state and React 19's `useActionState` to surface Server Action results (success/validation errors) back into the form.

**Why:** Some forms are simple (add a todo), some are more involved (log a workout: multiple exercises, each with sets of weight/reps or time). React Hook Form's marginal cost is low and its benefit scales with form complexity — worth adopting once, consistently.

**Consequences:** Easier — one validation source of truth (Zod) shared client/server; consistent form patterns across all domains. Harder — slightly more setup per form (schema + resolver) than a bare native form.

**Action items:**
- [ ] Define Zod schemas per entity in `lib/schemas/` (todos, exercises, workouts, workout_logs, set_logs, routines, routine_items)
- [ ] Wire `useActionState` + React Hook Form's `zodResolver` as the standard form pattern

---

## ADR-006: Real-Time Strategy

**Status:** Approved · **Date:** 2026-09-16

**Decision:** **No Supabase Realtime in v1.** All data updates happen via standard request/response (Server Actions + `revalidatePath`, per ADR-004). Realtime is deferred until a concrete use case demands it (e.g., multi-device sync while actively logging a workout, or a future multi-user household dashboard).

**Why:** Request/refresh fits the single-player, single-primary-device usage pattern. Building Realtime support now would be speculative complexity against a requirement that doesn't exist yet.

**Consequences:** Easier — simpler client code, no subscription lifecycle to manage. Harder — multi-tab/multi-device use requires a manual refresh to see the latest state. Revisit if/when a genuine live-sync need shows up.

**Action items:**
- [ ] None for v1 — revisit only if a real-time use case is confirmed later

---

## ADR-007: Deployment & Environment Strategy

**Status:** Approved · **Date:** 2026-09-16

**Decision:** **Two environments: `production` and `preview/development`**, each with its own Supabase project (not just a schema split), connected to Vercel's built-in Production/Preview environment variables. Database migrations are tracked in version control and applied via the Supabase CLI, not made by hand in the dashboard.

**Why:** RLS policies (ADR-002) and schema changes are part of ongoing phases — having an isolated environment to break things in is worth the small extra setup, especially since a bad RLS policy or migration on a single shared project would risk real personal data (todos, workout history).

**Consequences:** Easier — safe iteration on schema/RLS without risking real data; clear promotion path (dev → prod). Harder — need to keep two projects' schemas in sync via migrations rather than manual dashboard edits.

**Action items:**
- [ ] Create a second Supabase project for dev/preview
- [ ] Set up Supabase CLI migrations in the repo (`supabase/migrations/`)
- [ ] Wire Vercel Preview deployments to the dev Supabase project, Production to the prod project

---

## Summary Table

| ADR | Decision |
|---|---|
| 001 | Server Actions as the data-mutation layer; API Routes only for non-Next.js consumers |
| 002 | Supabase Auth + RLS enforced from day one, even for a single user |
| 003 | Zustand for client-only UI state; server data never mirrored into it |
| 004 | Server Components fetch data by default; `revalidatePath` refreshes after mutations |
| 005 | Zod schemas + React Hook Form + `useActionState`, shared client/server validation |
| 006 | No Realtime in v1 — request/refresh model |
| 007 | Separate Supabase projects for prod/dev, migrations tracked in version control |
