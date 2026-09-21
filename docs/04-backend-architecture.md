# Life OS — Backend Architecture (Phase 3)

Source: https://claude.ai/artifact/GmEcrHVzFNsHTU3WvutwKL

Builds directly on the approved Data Model and ADRs. This defines the concrete code layout, conventions, and request lifecycle that implement those decisions.

## 1. Project structure

```
life-os/
├─ app/
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  └─ layout.tsx                 # unauthenticated shell
│  ├─ (app)/                        # authenticated shell
│  │  ├─ layout.tsx                 # session check, nav
│  │  ├─ todos/
│  │  │  ├─ page.tsx                # Server Component, lists todos
│  │  │  └─ [id]/page.tsx
│  │  ├─ fitness/
│  │  │  ├─ exercises/page.tsx
│  │  │  ├─ workouts/page.tsx
│  │  │  ├─ workouts/[id]/page.tsx
│  │  │  └─ logs/page.tsx
│  │  ├─ routines/
│  │  │  ├─ page.tsx
│  │  │  └─ [id]/page.tsx
│  │  └─ goals/page.tsx
│  └─ layout.tsx                    # root layout
├─ actions/                         # Server Actions, one file per domain (ADR-001)
│  ├─ todos.ts
│  ├─ goals.ts
│  ├─ routines.ts
│  ├─ exercises.ts
│  ├─ workouts.ts
│  └─ links.ts
├─ lib/
│  ├─ supabase/
│  │  ├─ server.ts                  # server client (cookies-based, RLS-scoped)
│  │  ├─ client.ts                  # browser client (client components only)
│  │  └─ middleware.ts              # session refresh helper
│  ├─ validations/                  # Zod schemas, one file per domain (ADR-005)
│  │  ├─ todos.ts
│  │  ├─ goals.ts
│  │  ├─ routines.ts
│  │  └─ fitness.ts
│  ├─ types/
│  │  └─ database.ts                # generated Supabase types
│  └─ utils.ts
├─ components/
│  ├─ ui/                           # shadcn primitives
│  └─ [domain]/                     # domain-specific components
├─ stores/                          # Zustand, UI-only state (ADR-003)
│  ├─ use-ui-store.ts
│  └─ use-filter-store.ts
├─ supabase/
│  ├─ migrations/                   # versioned SQL migrations (ADR-007)
│  └─ config.toml
├─ middleware.ts                    # Next.js middleware — session refresh + route guard
└─ .env.local / .env.production     # separate Supabase project per env (ADR-007)
```

**Rationale:** domain-first grouping inside `actions/`, `validations/`, and `app/(app)/` keeps each of the three MVP domains (Todo, Fitness, Routines) independently extensible — new domains (Notes, Books, etc.) slot in as new folders without touching existing ones, matching the 19-domain long-term vision.

## 2. Request lifecycle

For a typical mutation (e.g. completing a todo):

1. **Server Component** (`app/(app)/todos/page.tsx`) fetches data directly via the Supabase server client — no API layer (ADR-004).
2. Data renders; the completion checkbox is a Client Component that calls a **Server Action** (`actions/todos.ts`) via `useActionState` (ADR-005).
3. The Server Action:
   - Re-validates input with the shared Zod schema from `lib/validations/todos.ts`.
   - Calls Supabase using the server client — RLS policies enforce row ownership (ADR-002), so no manual `user_id` filtering is needed beyond what RLS already requires on insert.
   - On success, calls `revalidatePath()` for the affected route (ADR-004) and returns a typed result (`{ success, error?, data? }`) consumed by `useActionState`.
4. No client-side cache layer, no Zustand mirroring of server data (ADR-003) — the Server Component re-fetch on revalidation is the only source of truth.
5. No Realtime subscriptions (ADR-006) — any other open tab reflects changes only on next navigation/refresh.

For a read-only page: Server Component queries Supabase directly, no Server Action involved.

## 3. Auth

- Supabase Auth (**email/password to start — no social login planned for v1, no magic link**).
- `middleware.ts` refreshes the session cookie on every request and redirects unauthenticated requests to `/login`.
- `lib/supabase/server.ts` creates a request-scoped client bound to the user's session cookie; every query automatically runs under that user's RLS context.
- Because this is single-player v1, RLS policies are simple ownership checks (`user_id = auth.uid()`) on every table, per ADR-002 — enforced now so multi-user is a non-breaking change later.

## 4. Validation layer

- One Zod schema module per domain in `lib/validations/`, exporting both the full schema and any partial/insert-specific variants (e.g. `todoInsertSchema`, `todoUpdateSchema`).
- The same schema is imported by:
  - the Server Action (server-side re-validation, source of truth), and
  - the React Hook Form resolver on the client (immediate UX feedback).
- No duplicate validation logic — this is the one shared contract between client and server called for in ADR-005.

## 5. Data fetching conventions

- Default: **Server Components fetch directly**, no `fetch()` wrapping, no route handlers.
- Server Actions are the only write path — no API Routes, no tRPC (ADR-001).
- **Filtering/sorting driven by URL search params** (read in the Server Component), not client state — keeps pages linkable/bookmarkable and avoids the client-state-mirrors-server-state anti-pattern ADR-003 rules out.
- Cross-domain links (the `links` table connecting e.g. a workout to a goal) are fetched via explicit joins in the relevant domain's query, not a generic "linked items" service — keeps each domain's data-access code self-contained.

## 6. Environments & migrations

- Two Supabase projects: `life-os-dev` and `life-os-prod` (ADR-007), separate env files.
- All schema changes go through versioned SQL files in `supabase/migrations/`, applied via the Supabase CLI (`supabase db push`) — never edited directly in the dashboard.
- `lib/types/database.ts` regenerated from the dev project after each migration (`supabase gen types typescript`) and committed, so Server Actions and Server Components get compile-time safety against the real schema.

## 7. Error handling

- Server Actions never throw to the client — they catch and return `{ success: false, error: string }`, which `useActionState` surfaces via the form UI.
- Supabase/Postgres errors (e.g. RLS rejection, unique constraint) are caught and mapped to short user-facing messages in a shared `lib/errors.ts` helper — raw Postgres error text never reaches the UI.
- **Unexpected errors are logged server-side (console only for v1)** — a hosted logging service (e.g. Sentry) is deferred to a later part of the build, not v1 scope. *(Superseded in v2 by ADR-008: production errors also go to Sentry, with strict limits on report contents.)*

## 8. Deployment

- Vercel, connected to the `main` branch of the repo (ADR-007).
- Preview deployments point at `life-os-dev`; production points at `life-os-prod`.
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role key server-only) set per Vercel environment.

## Confirmed decisions

- **Error logging:** console-only for v1 (no Sentry/logging service).
- **Auth method:** email/password only for v1, no magic link or OAuth.
- **URL-driven filters:** list filters (e.g. todos by status) live in search params rather than Zustand.
