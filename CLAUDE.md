# Life OS

A personal life-tracking web app. MVP domains: **Todo, Fitness, Routines** (Finance and 16 other domains deferred to later versions — see `docs/01-prd.md` §2). Single-player v1, web-only, no offline requirement.

**Why this exists:** replaces Obsidian (too much time customizing, not enough using it) and Notion (data entry/display never fit). The core idea: one relational data backbone, built to eventually support 19 life domains, with only 3 domains' worth of UI shipped in v1.

## Tech stack

Next.js (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · Vercel · Shadcn/ui · Zod · Zustand · React Hook Form · Lucide React

## Current phase

**Phase 8 — Implementation (Build).** Phases 1–7 (data model, architecture decisions, backend architecture, design system, wireframes, mockups, implementation plan) are approved and documented in `/docs`. Build order: **Todo → Fitness → Routines**, following the six stages in `docs/08-implementation-plan.md` (Stage 0: Setup is first).

## Full project docs

Read these in `/docs` before starting implementation work — each is a phase deliverable:

| File | Covers |
|---|---|
| `docs/01-prd.md` | Product scope, functional requirements (FR-01..FR-12), screen inventory |
| `docs/02-data-model.md` | Full ERD, SQL schema (13 tables), RLS policy shape |
| `docs/03-architecture-decisions.md` | 7 ADRs — Server Actions, Auth+RLS, Zustand scope, data fetching, forms, no realtime, deploy envs |
| `docs/04-backend-architecture.md` | Concrete folder structure, request lifecycle, auth, validation, error handling, deployment |
| `docs/05-design-system.md` | Color/type/spacing tokens (CSS variables), voice & content rules, component list |
| `docs/06-wireframes.md` | Approved low-fi screen list (structure only; visual canvas link inside) |
| `docs/07-mockups.md` | Approved hi-fi screen list (visual canvas link inside) |
| `docs/08-implementation-plan.md` | The build sequence itself — 6 stages, per-domain task shape, testing/repo decisions |

## Key architectural rules (see docs/03 and docs/04 for full rationale)

- **Data mutations:** Server Actions only, one file per domain in `actions/`. No API Routes, no tRPC.
- **Auth:** Supabase Auth, email/password only for v1 (no magic link, no OAuth). RLS enforced on every table from day one.
- **State:** Zustand for UI-only state (modals, tabs, filters-in-memory). Server data is never mirrored into it — Server Components fetch directly, `revalidatePath` refreshes after writes.
- **Forms:** Zod schema (shared client/server) + React Hook Form + `useActionState`.
- **Filters:** URL search params, not client state.
- **No Realtime** in v1 — request/refresh model only.
- **Environments:** two Supabase projects (`life-os-dev`, `life-os-prod`), migrations versioned in `supabase/migrations/`, never edited by hand in the dashboard.
- **Error handling:** Server Actions return `{ success, error?, data? }`, never throw to the client. Unexpected errors go through `logError()` (console, plus Sentry in production — ADR-008, which limits what a report may contain: no user content or identity).

## Design tokens quick reference

Light theme only. Font: Inter. Accent colors are domain identities *and* status semantics: **violet** = Todo/primary action, **teal** = Fitness/done, **blue** = Routines/in-progress, **pink** = overdue/attention. Full token values and voice/copy rules in `docs/05-design-system.md`.

## Testing

Vitest + React Testing Library for unit/component tests. Playwright for e2e (run against the dev Supabase project). Unit tests written alongside each domain's Server Actions as they're built, not bolted on after.

## Suggested first prompt to Claude Code

> Read CLAUDE.md and everything in /docs, then implement Stage 0 (Project Setup) from docs/08-implementation-plan.md.
