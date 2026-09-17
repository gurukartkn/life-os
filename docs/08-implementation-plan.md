# Life OS — Implementation Plan (Phase 7)

Source: https://claude.ai/artifact/L5cui6ygqGmnny1aZAYH5W

Turning the approved data model, architecture, design system, and mockups into working code.

**Inputs this plan builds on:**
- Data Model & ERD (Phase 1) — 13 tables: `user_settings`, `todos`, `goals`, `routines`, `routine_items`, `routine_completions`, `links`, `exercises`, `workouts`, `workout_exercises`, `workout_logs`, `set_logs`
- Architecture Decision Records (Phase 2) — Server Actions, Supabase Auth + RLS, Zustand for UI-only state, Server Components by default, Zod + RHF forms, no real-time in v1, separate prod/dev Supabase projects
- Backend Architecture (Phase 3) — project structure, auth, validation, error handling conventions
- Design System (Phase 4) — Inter, violet/teal/blue/pink tokens, 8 static components
- Wireframes & Mockups (Phases 5–6) — 4 approved screens: Shell + Today, Fitness Overview, Fitness Log Workout, Routines

## 1. Build Sequence

Work proceeds in six stages. Each stage ends with something clickable/reviewable before the next one starts.

### Stage 0 — Project Setup
- Initialize Next.js (App Router) + TypeScript project
- Install: Supabase JS client, Zustand, Zod, React Hook Form, Shadcn CLI, Lucide React
- Run Shadcn `init`, pull in the primitives the design system needs (Button, Input, Checkbox, Card, Tabs, Progress)
- Create two Supabase projects (dev, prod) per ADR-007; set up `.env.local` / Vercel env vars
- Configure Tailwind theme with Phase 4 tokens (colors, radius, font)
- Push initial migration (schema + RLS policies from the Data Model doc)
- Connect repo to Vercel, confirm a blank deploy works end-to-end

### Stage 1 — Foundation (Auth + Shell)
- Supabase email/password auth (sign up, log in, log out, session handling)
- App shell: sidebar nav, route groups, layout — wire the static Shell mockup to real routing
- `user_settings` row created on signup
- Empty Today page behind auth

**Checkpoint:** create an account, log in, and see an empty authenticated shell that matches the mockup.

### Stage 2 — Todo Domain
- `todos` table CRUD via Server Actions (ADR-001)
- Today page: stat row, add-todo form (Zod + RHF), todo list, status toggling
- URL search params for filters (per Backend Architecture doc)
- Minimal `goals` entity (create/list only — just enough for Fitness to link to it)

**Checkpoint:** Today screen fully functional against the mockup.

### Stage 3 — Fitness Domain
- `exercises`, `workouts`, `workout_exercises`, `workout_logs`, `set_logs` — CRUD + relations
- Fitness Overview: Workouts/Exercises tabs, workout cards, recent logs
- Fitness Log Workout: active session, per-set weight/reps/time inputs, save flow
- Link workouts to `goals` where applicable

**Checkpoint:** full log-a-workout flow works end-to-end, matches both Fitness mockups.

### Stage 4 — Routines Domain
- `routines`, `routine_items`, `routine_completions` — CRUD + daily-completion logic
- Routines screen: routine list + selected routine's daily checklist
- `links` table wired for cross-domain linking (e.g., routine → goal, todo → goal)

**Checkpoint:** Routines screen functional; cross-domain links visible somewhere in the UI.

### Stage 5 — Polish & Data Export
- Loading/empty/error states across all screens (Empty State component from design system)
- JSON data export (per PRD)
- Responsive pass, accessibility pass (focus states, labels)
- Console-only error logging wired consistently (per Backend Architecture doc)

## 2. Per-Domain Task Shape

Each domain (Todo, Fitness, Routines) follows the same internal breakdown, consistent with the Backend Architecture doc:

1. Zod schema(s) for the entity
2. Server Actions (create/update/delete) with validation + RLS-scoped queries
3. Server Component data fetching for the list/detail views
4. Client form components using `useActionState` + React Hook Form
5. `revalidatePath` wiring after mutations (no client-side cache per ADR-003/004)
6. UI assembled from Shadcn primitives styled to the design-system tokens

## 3. Confirmed Decisions

- **Testing:** [Vitest](https://vitest.dev) + React Testing Library for unit/component tests; [Playwright](https://playwright.dev) for e2e/user-acceptance tests.
  - Vitest over Jest: faster (native ESM/Vite transform, no Babel), near-identical API to Jest so no learning-curve cost, current default recommendation for Next.js App Router + TypeScript projects.
  - Playwright for e2e: auto-waiting, cross-browser, first-class TypeScript support, can run against a Vercel preview deployment in CI — a natural fit alongside ADR-007's dev/prod Supabase split (Playwright runs against the dev project).
  - Unit tests are written alongside each domain's Server Actions and components as they're built (Stage 2 onward, not bolted on later). E2E suites cover each stage's checkpoint flow (e.g., "log a full workout" as one Playwright test).
- **Repo hosting:** GitHub, connected to Vercel for deploys.
- **Domain build order:** Todo → Fitness → Routines.

## 4. Definition of Done for Phase 7

Phase 7 is approved. Stage 0 (Project Setup) is the first unit of actual implementation work — **Phase 8, currently in progress.**
