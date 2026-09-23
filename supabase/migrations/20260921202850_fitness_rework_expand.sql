begin;

create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index muscle_groups_user_id_lower_name_key
  on public.muscle_groups (user_id, lower(name));

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index equipment_user_id_lower_name_key
  on public.equipment (user_id, lower(name));

create table public.exercise_muscle_groups (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, muscle_group_id)
);
create index exercise_muscle_groups_muscle_group_id_idx
  on public.exercise_muscle_groups (muscle_group_id);

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, equipment_id)
);
create index exercise_equipment_equipment_id_idx
  on public.exercise_equipment (equipment_id);

alter table public.muscle_groups enable row level security;
create policy "own rows only" on public.muscle_groups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.equipment enable row level security;
create policy "own rows only" on public.equipment for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.exercise_muscle_groups enable row level security;
create policy "own rows only" on public.exercise_muscle_groups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.exercise_equipment enable row level security;
create policy "own rows only" on public.exercise_equipment for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.muscle_groups (user_id, name)
select distinct on (e.user_id, lower(btrim(m.name))) e.user_id, btrim(m.name)
from public.exercises e
cross join lateral unnest(e.muscle_groups) as m(name)
where btrim(m.name) <> ''
order by e.user_id, lower(btrim(m.name)), e.created_at, btrim(m.name)
on conflict do nothing;

insert into public.equipment (user_id, name)
select distinct on (e.user_id, lower(btrim(m.name))) e.user_id, btrim(m.name)
from public.exercises e
cross join lateral unnest(e.equipment) as m(name)
where btrim(m.name) <> ''
order by e.user_id, lower(btrim(m.name)), e.created_at, btrim(m.name)
on conflict do nothing;

insert into public.exercise_muscle_groups (exercise_id, muscle_group_id, user_id)
select distinct e.id, mg.id, e.user_id
from public.exercises e
cross join lateral unnest(e.muscle_groups) as m(name)
join public.muscle_groups mg
  on mg.user_id = e.user_id and lower(mg.name) = lower(btrim(m.name))
where btrim(m.name) <> ''
on conflict do nothing;

insert into public.exercise_equipment (exercise_id, equipment_id, user_id)
select distinct e.id, eq.id, e.user_id
from public.exercises e
cross join lateral unnest(e.equipment) as m(name)
join public.equipment eq
  on eq.user_id = e.user_id and lower(eq.name) = lower(btrim(m.name))
where btrim(m.name) <> ''
on conflict do nothing;

alter table public.workout_logs add column performed_at timestamptz;

update public.workout_logs wl
set performed_at = case
  when (wl.created_at at time zone tz.name)::date = wl.performed_on then wl.created_at
  else (wl.performed_on + time '12:00') at time zone tz.name
end
from (
  select l.id, coalesce(us.timezone, 'UTC') as name
  from public.workout_logs l
  left join public.user_settings us on us.user_id = l.user_id
) tz
where tz.id = wl.id;

alter table public.workout_logs alter column performed_at set default now();
alter table public.workout_logs alter column performed_at set not null;

commit;
