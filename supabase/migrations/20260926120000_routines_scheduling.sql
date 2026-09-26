-- v2 Routines (hi-fi mockups, Stage 4 boards): when a routine runs and how often each
-- item repeats. Expand only — `cadence` stays (defaulted) so older code keeps working;
-- a later contract migration drops it.
begin;

alter table public.routines
  add column time_of_day text not null default 'anytime'
    check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  add column frequency text not null default 'daily'
    check (frequency in ('daily', 'times_per_week', 'specific_days')),
  -- N times a week: 1–6 (seven is Daily).
  add column times_per_week smallint check (times_per_week between 1 and 6),
  -- Specific days: ISO weekdays, 1 = Monday … 7 = Sunday.
  add column weekdays smallint[] check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  add column is_active boolean not null default true,
  add constraint routines_frequency_shape check (
    (frequency = 'daily' and times_per_week is null and weekdays is null)
    or (frequency = 'times_per_week' and times_per_week is not null and weekdays is null)
    or (frequency = 'specific_days' and times_per_week is null and cardinality(weekdays) between 1 and 6)
  );

-- Existing weekly routines ran once a week; that is "1 time a week" now.
update public.routines set frequency = 'times_per_week', times_per_week = 1 where cadence = 'weekly';

alter table public.routines alter column cadence set default 'daily';

alter table public.routine_items
  add column repeat_rule text not null default 'every_time'
    check (repeat_rule in ('every_time', 'every_nth', 'weekly')),
  -- Every Nth time (or day, on a daily routine): 2–30.
  add column repeat_every smallint check (repeat_every between 2 and 30),
  add constraint routine_items_repeat_shape check (
    (repeat_rule = 'every_nth') = (repeat_every is not null)
  );

commit;
