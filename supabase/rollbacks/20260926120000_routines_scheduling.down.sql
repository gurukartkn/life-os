-- Inverse of migrations/20260926120000_routines_scheduling.sql. A routine that ran N
-- times a week goes back to `weekly` only when N was 1 (what the old model could say).
begin;

update public.routines set cadence = 'weekly' where frequency = 'times_per_week' and times_per_week = 1;

alter table public.routine_items
  drop constraint routine_items_repeat_shape,
  drop column repeat_every,
  drop column repeat_rule;

alter table public.routines alter column cadence drop default;

alter table public.routines
  drop constraint routines_frequency_shape,
  drop column is_active,
  drop column weekdays,
  drop column times_per_week,
  drop column frequency,
  drop column time_of_day;

commit;
