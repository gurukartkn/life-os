# Life OS — Data Model & ERD (Phase 1)

Source: https://claude.ai/artifact/RyUsWhuRf77CRsYRmPEEDM

Companion to the PRD and Build Workflow. MVP domains: **Tasks, Fitness, Routines**, plus the Universal Link Engine and a minimal Goal entity. Finance is deferred to a later version.

> **v2 Stage 2 (2026-09-21):** the `todos` table was renamed to `tasks` (primary key and foreign key renamed with it, RLS policy unchanged) and the `links` type value `todo` became `task`. Applied to life-os-dev and life-os-prod by `supabase/migrations/20260921193344_rename_todos_to_tasks.sql`; the inverse is `supabase/rollbacks/20260921193344_rename_todos_to_tasks.down.sql`.

> **v2 Routines (2026-09-26):** `routines` gains `time_of_day` (morning / afternoon / evening / anytime), `frequency` (daily / times_per_week / specific_days) with `times_per_week` (1–6) and `weekdays` (ISO 1–7, 1–6 of them), and `is_active` (archive). `routine_items` gains `repeat_rule` (every_time / every_nth / weekly) and `repeat_every` (2–30, for every_nth). Check constraints keep each shape consistent. `cadence` stays, defaulted to `daily`, until a contract migration drops it; weekly routines became "1 time a week". `routine_completions.period_start` is now always the day an item was done (in the user's timezone). Applied to life-os-dev and life-os-prod by `supabase/migrations/20260926120000_routines_scheduling.sql`; the inverse is `supabase/rollbacks/20260926120000_routines_scheduling.down.sql`.

## Entities

13 tables total, plus Supabase's own `auth.users`:

- `user_settings` — extends `auth.users` with app settings (timezone, needed for Routine reset boundaries)
- `tasks`
- `goals` — minimal, per FR-12
- `routines`, `routine_items`, `routine_completions` — a Routine is a checklist; items are the checklist rows; completions are period-stamped log entries, not a boolean that gets reset
- `links` — the generic cross-entity Link Engine (FR-02)
- `exercises` — the user's own exercise catalog (muscle groups, type, equipment)
- `workouts` — named templates ("Push Workout A")
- `workout_exercises` — which exercises belong to a template, in what order, with a target
- `workout_logs` — an actual performed session, on a date
- `set_logs` — individual sets within a session (weight+reps, or duration)

## ERD

```mermaid
erDiagram
  USERS ||--o| USER_SETTINGS : has
  USERS ||--o{ TASKS : owns
  USERS ||--o{ GOALS : owns
  USERS ||--o{ ROUTINES : owns
  USERS ||--o{ LINKS : owns
  USERS ||--o{ EXERCISES : owns
  USERS ||--o{ WORKOUTS : owns
  USERS ||--o{ WORKOUT_LOGS : owns
  ROUTINES ||--o{ ROUTINE_ITEMS : contains
  ROUTINE_ITEMS ||--o{ ROUTINE_COMPLETIONS : logs
  WORKOUTS ||--o{ WORKOUT_EXERCISES : prescribes
  EXERCISES ||--o{ WORKOUT_EXERCISES : used_in
  WORKOUTS ||--o{ WORKOUT_LOGS : performed_as
  WORKOUT_LOGS ||--o{ SET_LOGS : contains
  EXERCISES ||--o{ SET_LOGS : performed_via
  LINKS }o..o| TASKS : polymorphic
  LINKS }o..o| WORKOUT_LOGS : polymorphic
  LINKS }o..o| GOALS : polymorphic
  LINKS }o..o| ROUTINES : polymorphic

  USERS { uuid id PK }
  USER_SETTINGS { uuid user_id PK_FK text timezone }
  TASKS { uuid id PK uuid user_id FK text title bool is_completed date due_date }
  GOALS { uuid id PK uuid user_id FK text title date target_date text status }
  ROUTINES { uuid id PK uuid user_id FK text title text cadence }
  ROUTINE_ITEMS { uuid id PK uuid routine_id FK text title int sort_order }
  ROUTINE_COMPLETIONS { uuid id PK uuid routine_item_id FK date period_start }
  LINKS { uuid id PK uuid user_id FK text source_type uuid source_id text target_type uuid target_id text relationship_label }
  EXERCISES { uuid id PK uuid user_id FK text name text exercise_type text_array muscle_groups text_array equipment bool is_active }
  WORKOUTS { uuid id PK uuid user_id FK text name }
  WORKOUT_EXERCISES { uuid id PK uuid workout_id FK uuid exercise_id FK int sort_order int target_sets text target_reps }
  WORKOUT_LOGS { uuid id PK uuid user_id FK uuid workout_id FK date performed_on }
  SET_LOGS { uuid id PK uuid workout_log_id FK uuid exercise_id FK int set_number numeric weight int reps int duration_seconds }
```

## Schema

```sql
-- Extends auth.users with app settings
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_date date,
  status text check (status in ('active','completed','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cadence text not null check (cadence in ('daily','weekly')),
  created_at timestamptz not null default now()
);

create table routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized, see RLS note
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table routine_completions (
  id uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references routine_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized
  period_start date not null,       -- the day (daily) or week-start Monday (weekly)
  completed_at timestamptz not null default now(),
  unique (routine_item_id, period_start)
);

-- Exercise catalog — user's own library, not a shared/global list in v1
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercise_type text not null check (exercise_type in ('weight_training','cardio','other')),
  muscle_groups text[] not null default '{}',   -- e.g. {chest, triceps, shoulders}
  equipment text[] not null default '{}',        -- e.g. {barbell, bench} — empty for bodyweight
  is_active boolean not null default true,       -- archive instead of delete, preserves history
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Named workout plan/template — "Push Workout A", "Chest + Back A"
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which exercises belong to a workout template, in what order, with a target
create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized
  sort_order integer not null default 0,
  target_sets integer,
  target_reps text,   -- free text: "8-12", "AMRAP", "30s" — ranges don't fit a plain int
  created_at timestamptz not null default now()
);

-- An actual performed session of a workout, on a date
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references workouts(id) on delete set null, -- nullable: ad-hoc sessions allowed
  performed_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Individual sets performed within a session
create table set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized
  set_number integer not null default 1,
  weight numeric(6,2),        -- nullable: bodyweight exercises have no weight
  reps integer,                -- nullable: time-based sets use duration instead
  duration_seconds integer,    -- nullable: weight/rep sets use reps instead
  created_at timestamptz not null default now(),
  check (reps is not null or duration_seconds is not null)
);

create table links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('task','workout_log','goal','routine')),
  source_id uuid not null,
  target_type text not null check (target_type in ('task','workout_log','goal','routine')),
  target_id uuid not null,
  relationship_label text,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id)
);
```

## RLS policy shape

Every table carries a real `user_id` column — including child tables, denormalized rather than reached through a join. One policy pattern, verbatim, on every table:

```sql
alter table tasks enable row level security;

create policy "own rows only" on tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Swap the table name for the other eleven (twelve including `user_settings`, where `user_id` is the primary key itself). No table needs a subquery-based policy.

## Design decisions (candidates for Phase 2 ADRs)

- **Denormalized `user_id`** on every child table — trades a little redundancy for RLS policies that are all a single equality check, no joins.
- **`routine_completions` is existence-based, not a boolean** — a row's presence for a given `period_start` *is* the checked state. Nothing needs resetting; tomorrow just has no row yet. Implements the PRD's "lazy check-on-load" recommendation with zero cron infrastructure.
- **`links` has no real foreign keys** on `source_id`/`target_id` — can't point at four different tables with one constraint. Integrity is enforced at the app layer (Zod validates `source_type`/`target_type`).
- **`exercises`/`set_logs` use `on delete restrict`**, not cascade — retiring an exercise sets `is_active = false` rather than deleting it, so historical `set_logs` never lose their reference.
- **`workout_logs.workout_id` is nullable** — ad-hoc sessions (not built from a saved template) are allowed, to keep Quick Capture low-friction.
- **Task → Project linking** (mentioned in the PRD's screen inventory) has no backing table yet — Projects is still deferred, so only Goal and Routine links are functionally available in v1.
- **Finance is out of the schema entirely for v1** — deferred to a later version, not scaffolded now.
