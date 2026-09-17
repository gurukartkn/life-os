-- Initial schema for Life OS (Todo, Fitness, Routines, Links, Goals)
-- Source: docs/02-data-model.md

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

create table todos (
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
  source_type text not null check (source_type in ('todo','workout_log','goal','routine')),
  source_id uuid not null,
  target_type text not null check (target_type in ('todo','workout_log','goal','routine')),
  target_id uuid not null,
  relationship_label text,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id)
);

-- Row Level Security — one "own rows only" policy per table (docs/02-data-model.md)

alter table user_settings enable row level security;
create policy "own rows only" on user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table goals enable row level security;
create policy "own rows only" on goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table todos enable row level security;
create policy "own rows only" on todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table routines enable row level security;
create policy "own rows only" on routines
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table routine_items enable row level security;
create policy "own rows only" on routine_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table routine_completions enable row level security;
create policy "own rows only" on routine_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table exercises enable row level security;
create policy "own rows only" on exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table workouts enable row level security;
create policy "own rows only" on workouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table workout_exercises enable row level security;
create policy "own rows only" on workout_exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table workout_logs enable row level security;
create policy "own rows only" on workout_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table set_logs enable row level security;
create policy "own rows only" on set_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table links enable row level security;
create policy "own rows only" on links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
